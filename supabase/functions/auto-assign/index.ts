import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

serve(async (_req) => {
  const invocationId = crypto.randomUUID().slice(0, 8);
  const trace: any[] = [];
  console.log(`[auto-assign ${invocationId}] tick ${new Date().toISOString()}`);
  try {
    const now = new Date();
    await Promise.all([
      handleAutoAssign(now, trace),
      handleNoResponseEscalation(now, trace),
      handleOneHourReminder(now, trace),
      handleSmsFallback(now, trace),
    ]);
    return new Response(JSON.stringify({ ok: true, invocationId, trace }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`[auto-assign ${invocationId}] error:`, err);
    return new Response(JSON.stringify({ ok: false, invocationId, error: String(err), trace }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// =====================================================================
// 30-minute auto-assignment
//
// Only updates the callout row. The send-notification webhook on
// callouts UPDATE fires rows 4b (assigned worker) + 5 (other acceptors).
// =====================================================================
async function handleAutoAssign(now: Date, trace: any[]) {
  const nowIso = now.toISOString();
  const { data: callouts } = await supabase
    .schema('truvex').from('callouts')
    .select('id')
    .eq('status', 'pending_selection')
    .lte('auto_assign_at', nowIso);

  if (!callouts || callouts.length === 0) return;
  trace.push({ step: 'auto_assign_candidates', count: callouts.length });

  for (const c of callouts) {
    const { data: responses } = await supabase
      .schema('truvex').from('callout_responses')
      .select('worker_id, responded_at')
      .eq('callout_id', c.id)
      .eq('response', 'accepted')
      .order('responded_at', { ascending: true })
      .limit(1);

    if (!responses || responses.length === 0) {
      await supabase.schema('truvex').from('callouts')
        .update({ status: 'expired' })
        .eq('id', c.id);
      trace.push({ step: 'auto_assign_expired', callout_id: c.id });
      continue;
    }

    const winner = responses[0];
    await supabase.schema('truvex').from('callouts')
      .update({
        assigned_worker_id: winner.worker_id,
        assigned_at: nowIso,
        assigned_by: 'auto',
        status: 'filled',
      })
      .eq('id', c.id);
    trace.push({ step: 'auto_assigned', callout_id: c.id, worker_id: winner.worker_id });
  }
}

// =====================================================================
// Row 3: 15-minute no-response escalation → manager
// =====================================================================
async function handleNoResponseEscalation(now: Date, trace: any[]) {
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  const { data: callouts } = await supabase
    .schema('truvex').from('callouts')
    .select('id, manager_id, location_id, role_id, shift_date, start_time')
    .eq('status', 'open')
    .is('first_accepted_at', null)
    .lte('created_at', fifteenMinAgo);

  if (!callouts || callouts.length === 0) return;
  trace.push({ step: 'row3_candidates', count: callouts.length });

  for (const c of callouts) {
    const { count: existing } = await supabase
      .schema('truvex').from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('callout_id', c.id)
      .eq('type', 'no_response_escalation');
    if ((existing ?? 0) > 0) continue;

    const location = await fetchLocation(c.location_id);
    if (!location || !isPaidOrTrialing(location)) continue;

    const role = await fetchRole(c.role_id);
    const manager = await fetchProfile(c.manager_id);
    if (!manager) {
      trace.push({ step: 'row3_skipped_no_manager', callout_id: c.id });
      continue;
    }

    const msg = `No one has accepted the ${role?.name ?? ''} shift on ${formatShiftDate(c.shift_date)} at ${formatTime(c.start_time)} yet. You may want to reach out or post again.`;
    await sendPushAndLog(
      [{ user_id: manager.id, token: manager.expo_push_token, phone: manager.phone }],
      msg,
      { callout_id: c.id, type: 'no_response_escalation' },
      c.id,
      'no_response_escalation',
      trace,
    );
  }
}

// =====================================================================
// Row 9: 1-hour shift reminder → assigned worker
//
// Fires when a filled callout's shift is ~1 hour away, but only if the
// worker was assigned more than 3 hours before the shift starts.
//
// Uses shift_starts_at (timestamptz, written by the client at post time in
// the manager's local tz). Falls back to a naive UTC parse of
// shift_date + start_time for legacy rows with null shift_starts_at.
// =====================================================================
async function handleOneHourReminder(now: Date, trace: any[]) {
  const lowerMs = now.getTime() + 50 * 60 * 1000;
  const upperMs = now.getTime() + 70 * 60 * 1000;

  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: callouts } = await supabase
    .schema('truvex').from('callouts')
    .select('id, assigned_worker_id, assigned_at, location_id, role_id, shift_date, start_time, shift_starts_at')
    .eq('status', 'filled')
    .in('shift_date', [yesterday, today, tomorrow])
    .not('assigned_worker_id', 'is', null);

  if (!callouts || callouts.length === 0) return;
  trace.push({ step: 'row9_candidates', count: callouts.length });

  for (const c of callouts) {
    const shiftStart = c.shift_starts_at
      ? new Date(c.shift_starts_at).getTime()
      : new Date(`${c.shift_date}T${c.start_time}Z`).getTime();
    if (isNaN(shiftStart)) continue;
    if (shiftStart < lowerMs || shiftStart > upperMs) continue;

    if (c.assigned_at) {
      const assignedMs = new Date(c.assigned_at).getTime();
      if (shiftStart - assignedMs <= 3 * 60 * 60 * 1000) {
        trace.push({ step: 'row9_skipped_within_3h', callout_id: c.id });
        continue;
      }
    }

    const { count: existing } = await supabase
      .schema('truvex').from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('callout_id', c.id)
      .eq('type', 'shift_reminder');
    if ((existing ?? 0) > 0) continue;

    const location = await fetchLocation(c.location_id);
    if (!location || !isPaidOrTrialing(location)) continue;

    const role = await fetchRole(c.role_id);
    const worker = await fetchProfile(c.assigned_worker_id);
    if (!worker) {
      trace.push({ step: 'row9_skipped_no_worker', callout_id: c.id });
      continue;
    }

    const msg = `Reminder: your ${role?.name ?? ''} shift at ${location.name} starts in 1 hour.`;
    await sendPushAndLog(
      [{ user_id: worker.id, token: worker.expo_push_token, phone: worker.phone }],
      msg,
      { callout_id: c.id, type: 'shift_reminder' },
      c.id,
      'shift_reminder',
      trace,
    );
  }
}

// =====================================================================
// SMS fallback: 2-minute fallback for unopened push notifications
//
// Runs every cron tick (every 5 min). Finds push log entries that are
// 2+ minutes old with opened_at IS NULL and no existing SMS log for the
// same (user_id, callout_id, type). Sends Twilio SMS using the stored body.
//
// NOTE: opened_at is not currently written by the mobile app. Until it is,
// every push notification will trigger an SMS fallback after 2+ minutes.
// This is intentional during development (doubles as delivery confirmation).
// =====================================================================
async function handleSmsFallback(now: Date, trace: any[]) {
  const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

  const { data: pushLogs } = await supabase
    .schema('truvex').from('notification_log')
    .select('id, user_id, callout_id, type, body, user:profiles!notification_log_user_id_fkey(phone)')
    .eq('channel', 'push')
    .in('type', [...SMS_ELIGIBLE_TYPES])
    .is('opened_at', null)
    .lte('sent_at', twoMinAgo)
    .not('body', 'is', null);

  if (!pushLogs || pushLogs.length === 0) return;
  trace.push({ step: 'sms_fallback_candidates', count: pushLogs.length });

  for (const log of pushLogs) {
    const phone = (log as any).user?.phone;
    if (!phone) continue;

    const { count } = await supabase
      .schema('truvex').from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', log.user_id)
      .eq('callout_id', log.callout_id)
      .eq('type', log.type)
      .eq('channel', 'sms');

    if ((count ?? 0) > 0) continue;

    try {
      await sendSms(phone, log.body!);
      await supabase.schema('truvex').from('notification_log').insert({
        user_id: log.user_id,
        callout_id: log.callout_id,
        channel: 'sms',
        type: log.type,
        body: log.body,
      });
      trace.push({ step: 'sms_fallback_sent', type: log.type, user_id: log.user_id });
      console.log(`[auto-assign sms] fallback type=${log.type} user=${log.user_id}`);
    } catch (err) {
      trace.push({ step: 'sms_fallback_failed', type: log.type, user_id: log.user_id, error: String(err) });
      console.error(`[auto-assign sms] fallback failed type=${log.type} user=${log.user_id}:`, err);
    }
  }
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

async function fetchProfile(id: string) {
  const { data } = await supabase
    .schema('truvex').from('profiles')
    .select('id, phone, name, expo_push_token')
    .eq('id', id).single();
  return data;
}

function isPaidOrTrialing(location: any): boolean {
  const isPaid = location.subscription_tier === 'pro' || location.subscription_tier === 'business';
  const trialActive =
    location.subscription_status === 'trialing' &&
    location.trial_ends_at &&
    new Date(location.trial_ends_at).getTime() > Date.now();
  return isPaid || trialActive;
}

// Sends Expo push to token holders, immediate SMS to no-token recipients
// (for SMS-eligible types), and logs every send with the message body.
async function sendPushAndLog(
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
      console.log(`[auto-assign push] recipient type=${type} user=${r.user_id} token=…${r.token!.slice(-10)}`);
    }

    const messages = withToken.map((r) => ({
      to: r.token!, sound: 'default', body, data, priority: 'high',
    }));
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (EXPO_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;

    const res = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(messages) });
    const responseText = await res.text();
    trace.push({ step: 'expo_push', type, status: res.status, ok: res.ok, count: withToken.length, response: responseText.slice(0, 300) });
    console.log(`[auto-assign push] sent type=${type} count=${withToken.length} status=${res.status}`);

    const logRows = withToken.map((r) => ({
      user_id: r.user_id,
      callout_id: calloutId,
      channel: 'push',
      type,
      body,
    }));
    await supabase.schema('truvex').from('notification_log').insert(logRows);
  } else {
    trace.push({ step: 'push_skipped_no_tokens', type, targets: recipients.length });
    console.log(`[auto-assign push] skipped type=${type} targets=${recipients.length} noTokens`);
  }

  // Immediate SMS for no-token recipients on SMS-eligible types
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
        console.log(`[auto-assign sms] immediate type=${type} user=${r.user_id}`);
      } catch (err) {
        trace.push({ step: 'sms_immediate_failed', type, user_id: r.user_id, error: String(err) });
        console.error(`[auto-assign sms] immediate failed type=${type} user=${r.user_id}:`, err);
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
  console.log(`[auto-assign sms] sent sid=${respData.sid} to=…${to.slice(-4)}`);
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
