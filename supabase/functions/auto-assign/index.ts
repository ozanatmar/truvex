import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (_req) => {
  const trace: any[] = [];
  try {
    const now = new Date();
    await Promise.all([
      handleAutoAssign(now, trace),
      handleNoResponseEscalation(now, trace),
      handleOneHourReminder(now, trace),
    ]);
    return new Response(JSON.stringify({ ok: true, trace }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('auto-assign error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err), trace }), {
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
    if (!manager?.expo_push_token) continue;

    const msg = `No one has accepted the ${role?.name ?? ''} shift on ${formatShiftDate(c.shift_date)} at ${formatTime(c.start_time)} yet. You may want to reach out or post again.`;
    await sendPushAndLog(
      [{ user_id: manager.id, token: manager.expo_push_token }],
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
// TZ caveat: shift_date + start_time is treated as UTC for now.
// Fix by adding locations.timezone and localizing the timestamp.
// =====================================================================
async function handleOneHourReminder(now: Date, trace: any[]) {
  // Find filled callouts whose (shift_date + start_time) is between 50 and 70 min from now.
  // Cron runs every minute; a 20-min window avoids double-fire races and log-check handles idempotency.
  const lowerMs = now.getTime() + 50 * 60 * 1000;
  const upperMs = now.getTime() + 70 * 60 * 1000;

  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: callouts } = await supabase
    .schema('truvex').from('callouts')
    .select('id, assigned_worker_id, assigned_at, location_id, role_id, shift_date, start_time')
    .eq('status', 'filled')
    .in('shift_date', [today, tomorrow])
    .not('assigned_worker_id', 'is', null);

  if (!callouts || callouts.length === 0) return;
  trace.push({ step: 'row9_candidates', count: callouts.length });

  for (const c of callouts) {
    const shiftStart = new Date(`${c.shift_date}T${c.start_time}Z`).getTime();
    if (isNaN(shiftStart)) continue;
    if (shiftStart < lowerMs || shiftStart > upperMs) continue;

    // 3-hour gate: assigned_at must be > 3h before shift_start
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
    if (!worker?.expo_push_token) continue;

    const msg = `Reminder: your ${role?.name ?? ''} shift at ${location.name} starts in 1 hour.`;
    await sendPushAndLog(
      [{ user_id: worker.id, token: worker.expo_push_token }],
      msg,
      { callout_id: c.id, type: 'shift_reminder' },
      c.id,
      'shift_reminder',
      trace,
    );
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

async function sendPushAndLog(
  recipients: { user_id: string; token: string | null | undefined }[],
  body: string,
  data: Record<string, unknown>,
  calloutId: string | null,
  type: string,
  trace: any[],
) {
  const withToken = recipients.filter((r) => !!r.token);
  if (withToken.length === 0) return;

  const messages = withToken.map((r) => ({
    to: r.token!, sound: 'default', body, data, priority: 'high',
  }));
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (EXPO_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST', headers, body: JSON.stringify(messages),
  });
  const responseText = await res.text();
  trace.push({ step: 'expo_push', type, status: res.status, ok: res.ok, count: withToken.length, response: responseText.slice(0, 300) });

  const logRows = withToken.map((r) => ({
    user_id: r.user_id,
    callout_id: calloutId,
    channel: 'push',
    type,
  }));
  await supabase.schema('truvex').from('notification_log').insert(logRows);
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
