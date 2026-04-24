import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Types eligible for SMS per CLAUDE.md notification table
const SMS_ELIGIBLE_TYPES = new Set([
  'callout_posted',
  'first_acceptance',
  'no_response_escalation',
  'selected',
  'selected_auto',
  'worker_removed_manager',
  'shift_reminder',
]);

type Recipient = { user_id: string; token: string | null | undefined; phone?: string | null };

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
};

serve(async (req) => {
  const invocationId = crypto.randomUUID().slice(0, 8);
  const startedAt = new Date().toISOString();
  const trace: any[] = [];
  console.log(`[send-notification ${invocationId}] start ${startedAt}`);
  try {
    const payload = (await req.json()) as WebhookPayload;
    const recordId = (payload.record?.id ?? payload.old_record?.id ?? null) as string | null;
    trace.push({ step: 'received', invocationId, table: payload.table, event: payload.type, recordId });
    console.log(`[send-notification ${invocationId}] received table=${payload.table} event=${payload.type} recordId=${recordId}`);

    const result = await dispatch(payload, trace, invocationId);
    console.log(`[send-notification ${invocationId}] done result=${JSON.stringify(result)}`);
    return json({ ok: true, invocationId, trace, result }, 200);
  } catch (err) {
    console.error(`[send-notification ${invocationId}] error:`, err);
    return json({ ok: false, invocationId, error: String(err), trace }, 500);
  }
});

async function dispatch(payload: WebhookPayload, trace: any[], invocationId: string) {
  const { table, type, record, old_record } = payload;

  if (table === 'callouts' && type === 'INSERT' && record?.status === 'open') {
    return handleCalloutPosted(record, trace);
  }

  if (table === 'callouts' && type === 'UPDATE' && record && old_record) {
    if (!old_record.assigned_worker_id && record.assigned_worker_id) {
      return handleWorkerAssigned(record, trace);
    }
    if (old_record.status !== 'cancelled' && record.status === 'cancelled') {
      return handleCalloutCancelled(record, trace);
    }
    trace.push({ step: 'callouts_update_no_match' });
    return { skipped: 'no_matching_callout_update' };
  }

  if (table === 'callout_responses' && type === 'INSERT' && record?.response === 'accepted') {
    return handleResponseAccepted(record, trace);
  }

  if (table === 'location_members' && type === 'DELETE' && old_record) {
    return handleWorkerRemoved(old_record, trace);
  }

  trace.push({ step: 'unhandled' });
  return { skipped: 'unhandled_event' };
}

// =====================================================================
// Row 1: Callout posted → eligible workers
// =====================================================================
async function handleCalloutPosted(callout: any, trace: any[]) {
  trace.push({ step: 'row1_start', callout_id: callout.id });

  const location = await fetchLocation(callout.location_id);
  if (!location) { trace.push({ step: 'location_missing' }); return { stopped: 'location' }; }
  if (!isPaidOrTrialing(location)) { trace.push({ step: 'no_pro_features' }); return { stopped: 'no_pro' }; }

  const role = await fetchRole(callout.role_id);
  if (!role) { trace.push({ step: 'role_missing' }); return { stopped: 'role' }; }

  const { data: members } = await supabase
    .schema('truvex').from('location_members')
    .select('user_id, is_muted, user:profiles!location_members_user_id_fkey(id, phone, expo_push_token)')
    .eq('location_id', callout.location_id)
    .eq('member_type', 'worker')
    .eq('status', 'active')
    .eq('is_muted', false);

  if (!members || members.length === 0) { trace.push({ step: 'no_members' }); return { stopped: 'no_members' }; }

  let eligibleIds: string[];
  if (callout.open_to_all_roles) {
    eligibleIds = members.map((m: any) => m.user_id);
  } else {
    const { data: wr } = await supabase
      .schema('truvex').from('worker_roles')
      .select('user_id')
      .eq('location_id', callout.location_id)
      .eq('role_id', callout.role_id);
    const ids = new Set((wr ?? []).map((r: any) => r.user_id));
    eligibleIds = members.filter((m: any) => ids.has(m.user_id)).map((m: any) => m.user_id);
  }

  const eligible = members.filter((m: any) => eligibleIds.includes(m.user_id));
  trace.push({ step: 'row1_eligible', count: eligible.length });
  if (eligible.length === 0) return { stopped: 'no_eligible' };

  const message = `New shift: ${role.name} on ${formatShiftDate(callout.shift_date)} ${formatTime(callout.start_time)}–${formatTime(callout.end_time)}. Open Truvex to accept.`;

  await pushAndLog(
    eligible.map((m: any) => ({ user_id: m.user_id, token: m.user?.expo_push_token, phone: m.user?.phone })),
    message,
    { callout_id: callout.id, type: 'callout_posted' },
    callout.id,
    'callout_posted',
    trace,
  );
  return { done: true };
}

// =====================================================================
// Row 2: First worker accepts → manager
// =====================================================================
async function handleResponseAccepted(response: any, trace: any[]) {
  trace.push({ step: 'row2_start', callout_id: response.callout_id, worker_id: response.worker_id });

  // Confirm this is the first accepted response
  const { count } = await supabase
    .schema('truvex').from('callout_responses')
    .select('id', { count: 'exact', head: true })
    .eq('callout_id', response.callout_id)
    .eq('response', 'accepted');

  if ((count ?? 0) !== 1) {
    trace.push({ step: 'not_first_acceptance', count });
    return { skipped: 'not_first' };
  }

  const callout = await fetchCallout(response.callout_id);
  if (!callout) return { stopped: 'callout_missing' };

  const location = await fetchLocation(callout.location_id);
  if (!location || !isPaidOrTrialing(location)) return { stopped: 'no_pro' };

  const role = await fetchRole(callout.role_id);
  const worker = await fetchProfile(response.worker_id);
  const manager = await fetchProfile(callout.manager_id);
  if (!manager) return { stopped: 'manager_missing' };

  const workerName = worker?.name || 'A worker';
  const managerLocations = await countManagerLocations(callout.manager_id);
  const locPart = managerLocations > 1 ? ` at ${location.name}` : '';
  const message = `${workerName} accepted the ${role?.name ?? ''} shift${locPart} on ${formatShiftDate(callout.shift_date)} at ${formatTime(callout.start_time)}. Tap to confirm who covers.`;

  await pushAndLog(
    [{ user_id: manager.id, token: manager.expo_push_token, phone: manager.phone }],
    message,
    { callout_id: callout.id, type: 'first_acceptance' },
    callout.id,
    'first_acceptance',
    trace,
  );
  return { done: true };
}

// =====================================================================
// Rows 4 + 5: Worker assigned → assigned worker + other acceptors
// =====================================================================
async function handleWorkerAssigned(callout: any, trace: any[]) {
  trace.push({ step: 'row4_start', callout_id: callout.id, assigned_worker_id: callout.assigned_worker_id, assigned_by: callout.assigned_by });

  const location = await fetchLocation(callout.location_id);
  if (!location || !isPaidOrTrialing(location)) return { stopped: 'no_pro' };

  const role = await fetchRole(callout.role_id);
  const shiftDateStr = formatShiftDate(callout.shift_date);
  const startStr = formatTime(callout.start_time);

  // Row 4a/4b — assigned worker
  const assigned = await fetchProfile(callout.assigned_worker_id);
  if (assigned) {
    const assignedMsg = callout.assigned_by === 'auto'
      ? `You've been auto-assigned the ${role?.name ?? ''} shift on ${shiftDateStr} at ${startStr}.`
      : `You're confirmed for the ${role?.name ?? ''} shift on ${shiftDateStr} at ${startStr}.`;

    await pushAndLog(
      [{ user_id: assigned.id, token: assigned.expo_push_token, phone: assigned.phone }],
      assignedMsg,
      { callout_id: callout.id, type: 'assigned' },
      callout.id,
      callout.assigned_by === 'auto' ? 'selected_auto' : 'selected',
      trace,
    );
  }

  // Row 5 — other acceptors (push only, no SMS)
  const { data: others } = await supabase
    .schema('truvex').from('callout_responses')
    .select('worker_id, worker:profiles!callout_responses_worker_id_fkey(id, phone, expo_push_token)')
    .eq('callout_id', callout.id)
    .eq('response', 'accepted')
    .neq('worker_id', callout.assigned_worker_id);

  if (others && others.length > 0) {
    const otherMsg = `The ${role?.name ?? ''} shift on ${shiftDateStr} at ${startStr} was filled by someone else.`;
    await pushAndLog(
      others.map((r: any) => ({ user_id: r.worker_id, token: r.worker?.expo_push_token, phone: r.worker?.phone })),
      otherMsg,
      { callout_id: callout.id, type: 'not_selected' },
      callout.id,
      'not_selected',
      trace,
    );
  }

  return { done: true };
}

// =====================================================================
// Row 6: Callout cancelled → notified workers (push only, no SMS)
// =====================================================================
async function handleCalloutCancelled(callout: any, trace: any[]) {
  trace.push({ step: 'row6_start', callout_id: callout.id });

  const location = await fetchLocation(callout.location_id);
  if (!location || !isPaidOrTrialing(location)) return { stopped: 'no_pro' };
  const role = await fetchRole(callout.role_id);

  const { data: notified } = await supabase
    .schema('truvex').from('notification_log')
    .select('user_id, user:profiles!notification_log_user_id_fkey(id, phone, expo_push_token)')
    .eq('callout_id', callout.id)
    .eq('type', 'callout_posted')
    .eq('channel', 'push');

  if (!notified || notified.length === 0) { trace.push({ step: 'no_notified' }); return { stopped: 'no_notified' }; }

  // Deduplicate by user_id
  const seen = new Set<string>();
  const unique = notified.filter((n: any) => (seen.has(n.user_id) ? false : seen.add(n.user_id)));

  const msg = `The ${role?.name ?? ''} shift on ${formatShiftDate(callout.shift_date)} at ${formatTime(callout.start_time)} has been cancelled.`;
  await pushAndLog(
    unique.map((n: any) => ({ user_id: n.user_id, token: n.user?.expo_push_token, phone: n.user?.phone })),
    msg,
    { callout_id: callout.id, type: 'shift_cancelled' },
    callout.id,
    'shift_cancelled',
    trace,
  );
  return { done: true };
}

// =====================================================================
// Rows 7 + 8: Worker removed from location
// =====================================================================
async function handleWorkerRemoved(member: any, trace: any[]) {
  if (member.member_type !== 'worker' || !member.user_id) {
    trace.push({ step: 'not_active_worker' });
    return { skipped: 'not_worker' };
  }
  trace.push({ step: 'row7_8_start', location_id: member.location_id, user_id: member.user_id });

  const location = await fetchLocation(member.location_id);
  if (!location) return { stopped: 'location_missing' };
  if (!isPaidOrTrialing(location)) { trace.push({ step: 'no_pro' }); return { stopped: 'no_pro' }; }

  // Row 8 — removed worker (push only, no SMS)
  const worker = await fetchProfile(member.user_id);
  if (worker) {
    const msg = `You've been removed from ${location.name}.`;
    await pushAndLog(
      [{ user_id: worker.id, token: worker.expo_push_token, phone: worker.phone }],
      msg,
      { location_id: member.location_id, type: 'worker_removed_self' },
      null,
      'worker_removed_self',
      trace,
    );
  }

  // Row 7 — manager (SMS eligible — only if removed worker held an accepted response on an active callout)
  const { data: pendingAccepts } = await supabase
    .schema('truvex').from('callout_responses')
    .select('callout_id, callout:callouts!callout_responses_callout_id_fkey(id, status, role_id, shift_date, start_time, manager_id, location_id)')
    .eq('worker_id', member.user_id)
    .eq('response', 'accepted');

  if (pendingAccepts) {
    for (const row of pendingAccepts) {
      const c = (row as any).callout;
      if (!c || c.location_id !== member.location_id) continue;
      if (!['open', 'pending_selection'].includes(c.status)) continue;

      const role = await fetchRole(c.role_id);
      const manager = await fetchProfile(c.manager_id);
      const workerName = worker?.name || 'A worker';
      const msg = `${workerName} was removed but had accepted the ${role?.name ?? ''} shift on ${formatShiftDate(c.shift_date)} at ${formatTime(c.start_time)}. Don't forget to post a new callout.`;

      if (manager) {
        await pushAndLog(
          [{ user_id: manager.id, token: manager.expo_push_token, phone: manager.phone }],
          msg,
          { callout_id: c.id, type: 'worker_removed_manager' },
          c.id,
          'worker_removed_manager',
          trace,
        );
      }
    }
  }
  return { done: true };
}

// =====================================================================
// Helpers
// =====================================================================
async function fetchLocation(id: string) {
  const { data } = await supabase
    .schema('truvex').from('locations')
    .select('id, name, subscription_tier, subscription_status, trial_ends_at')
    .eq('id', id).single();
  return data;
}

async function fetchRole(id: string) {
  const { data } = await supabase
    .schema('truvex').from('roles').select('id, name').eq('id', id).single();
  return data;
}

async function fetchCallout(id: string) {
  const { data } = await supabase
    .schema('truvex').from('callouts').select('*').eq('id', id).single();
  return data;
}

async function fetchProfile(id: string) {
  const { data } = await supabase
    .schema('truvex').from('profiles')
    .select('id, phone, name, expo_push_token')
    .eq('id', id).single();
  return data;
}

async function countManagerLocations(managerId: string): Promise<number> {
  const { count } = await supabase
    .schema('truvex').from('locations')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', managerId);
  return count ?? 0;
}

function isPaidOrTrialing(location: any): boolean {
  const isPaid = location.subscription_tier === 'pro' || location.subscription_tier === 'business';
  const trialActive =
    location.subscription_status === 'trialing' &&
    location.trial_ends_at &&
    new Date(location.trial_ends_at).getTime() > Date.now();
  return isPaid || trialActive;
}

// Sends Expo push to token holders and logs each send with the message body.
// For SMS-eligible types, also sends Twilio SMS immediately to recipients with
// no push token — this covers dev/test environments where push isn't available
// and production users who never registered for push.
// The 2-minute fallback SMS for token holders who don't open their push
// is handled separately by handleSmsFallback in the auto-assign cron job.
async function pushAndLog(
  recipients: Recipient[],
  body: string,
  data: Record<string, unknown>,
  calloutId: string | null,
  type: string,
  trace: any[],
) {
  const withToken = recipients.filter((r) => !!r.token);
  const noToken = recipients.filter((r) => !r.token);

  if (withToken.length > 0) {
    for (const r of withToken) {
      console.log(`[push] recipient type=${type} user=${r.user_id} token=…${r.token!.slice(-10)}`);
    }

    const messages = withToken.map((r) => ({
      to: r.token!,
      sound: 'default',
      body,
      data,
      priority: 'high',
    }));

    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (EXPO_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });
    const responseText = await res.text();
    trace.push({ step: 'expo_push', type, status: res.status, ok: res.ok, count: withToken.length, response: responseText.slice(0, 500) });
    console.log(`[push] sent type=${type} count=${withToken.length} status=${res.status} expoResp=${responseText.slice(0, 300)}`);

    const logRows = withToken.map((r) => ({
      user_id: r.user_id,
      callout_id: calloutId,
      channel: 'push',
      type,
      body,
    }));
    const { error: logError } = await supabase.schema('truvex').from('notification_log').insert(logRows);
    if (logError) {
      trace.push({ step: 'log_insert_failed', type, error: logError });
      console.error(`[push] log insert failed type=${type}`, logError);
    }
  } else {
    trace.push({ step: 'push_skipped_no_tokens', type, targets: recipients.length });
    console.log(`[push] skipped type=${type} targets=${recipients.length} noTokens`);
  }

  // Immediate SMS for recipients with no push token on SMS-eligible types
  if (SMS_ELIGIBLE_TYPES.has(type)) {
    const withPhone = noToken.filter((r) => !!r.phone);
    for (const r of withPhone) {
      try {
        await sendSms(r.phone!, body);
        await supabase.schema('truvex').from('notification_log').insert({
          user_id: r.user_id,
          callout_id: calloutId,
          channel: 'sms',
          type,
          body,
        });
        trace.push({ step: 'sms_immediate', type, user_id: r.user_id });
        console.log(`[sms] immediate type=${type} user=${r.user_id}`);
      } catch (err) {
        trace.push({ step: 'sms_immediate_failed', type, user_id: r.user_id, error: String(err) });
        console.error(`[sms] immediate failed type=${type} user=${r.user_id}:`, err);
      }
    }
    if (withPhone.length === 0 && noToken.length > 0) {
      trace.push({ step: 'sms_skipped_no_phone', type, noTokenCount: noToken.length });
    }
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('[sms] Twilio env vars not set — skipping');
    return;
  }
  if (to.startsWith('+1555')) {
    console.log(`[sms] skipped Supabase test number to=…${to.slice(-4)}`);
    return;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio SMS error ${res.status}: ${text}`);
  }
  const respData = await res.json();
  console.log(`[sms] sent sid=${respData.sid} to=…${to.slice(-4)}`);
}

function formatShiftDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${minuteStr} ${period}`;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
