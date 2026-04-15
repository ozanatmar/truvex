import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (_req) => {
  try {
    const now = new Date().toISOString();

    await Promise.all([
      handleAutoAssign(now),
      handleNoResponseEscalation(now),
      handleSelectionNudge(now),
      handleSMSFallback(now),
    ]);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('auto-assign error:', err);
    return new Response(String(err), { status: 500 });
  }
});

// =====================================================================
// 30-minute auto-assignment
// =====================================================================
async function handleAutoAssign(now: string) {
  const { data: callouts } = await supabase
    .from('truvex.callouts')
    .select('*, role:truvex.roles(name), location:truvex.locations(name, subscription_tier)')
    .eq('status', 'pending_selection')
    .lte('auto_assign_at', now);

  if (!callouts || callouts.length === 0) return;

  for (const callout of callouts) {
    // Get earliest acceptor
    const { data: responses } = await supabase
      .from('truvex.callout_responses')
      .select('worker_id, responded_at, worker:truvex.profiles(phone, expo_push_token)')
      .eq('callout_id', callout.id)
      .eq('response', 'accepted')
      .order('responded_at', { ascending: true })
      .limit(1);

    if (!responses || responses.length === 0) {
      // No acceptors — expire callout
      await supabase
        .from('truvex.callouts')
        .update({ status: 'expired' })
        .eq('id', callout.id);
      continue;
    }

    const winner = responses[0];

    // Assign the shift
    await supabase
      .from('truvex.callouts')
      .update({
        assigned_worker_id: winner.worker_id,
        assigned_at: now,
        assigned_by: 'auto',
        status: 'filled',
      })
      .eq('id', callout.id);

    // Notify assigned worker
    const assignedMsg = `You've been automatically assigned the ${(callout as any).role.name} shift on ${callout.shift_date} at ${formatTime(callout.start_time)}.`;
    await notifyWorker(winner.worker_id, (winner as any).worker, assignedMsg, callout.id, 'selected');

    // Notify all other acceptors
    const { data: allResponses } = await supabase
      .from('truvex.callout_responses')
      .select('worker_id, worker:truvex.profiles(phone, expo_push_token)')
      .eq('callout_id', callout.id)
      .eq('response', 'accepted')
      .neq('worker_id', winner.worker_id);

    if (allResponses) {
      for (const r of allResponses) {
        await notifyWorker(
          r.worker_id,
          (r as any).worker,
          'This shift has been filled by someone else.',
          callout.id,
          'not_selected'
        );
      }
    }

    // Notify all notified workers that shift is filled
    const filledMsg = `The ${(callout as any).role.name} shift on ${callout.shift_date} has been filled.`;
    const { data: notified } = await supabase
      .from('truvex.notification_log')
      .select('user_id, user:truvex.profiles(phone, expo_push_token)')
      .eq('callout_id', callout.id)
      .eq('type', 'callout_posted');

    if (notified) {
      const notifiedIds = new Set(notified.map((n: any) => n.user_id));
      notifiedIds.delete(winner.worker_id);
      for (const n of notified) {
        if (n.user_id !== winner.worker_id) {
          await notifyWorker(n.user_id, (n as any).user, filledMsg, callout.id, 'shift_filled');
        }
      }
    }
  }
}

// =====================================================================
// 15-minute no-response escalation
// =====================================================================
async function handleNoResponseEscalation(now: string) {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: callouts } = await supabase
    .from('truvex.callouts')
    .select('*, role:truvex.roles(name), manager:truvex.profiles(phone, expo_push_token)')
    .eq('status', 'open')
    .is('first_accepted_at', null)
    .lte('created_at', fifteenMinAgo);

  if (!callouts) return;

  for (const callout of callouts) {
    // Check if we already sent this escalation
    const { data: existing } = await supabase
      .from('truvex.notification_log')
      .select('id')
      .eq('callout_id', callout.id)
      .eq('type', 'no_response_escalation')
      .limit(1);

    if (existing && existing.length > 0) continue;

    const msg = `No one has accepted the ${(callout as any).role.name} shift yet.`;
    await notifyUser(callout.manager_id, (callout as any).manager, msg, callout.id, 'no_response_escalation');
  }
}

// =====================================================================
// 5-minute "please select" nudge after first acceptance
// =====================================================================
async function handleSelectionNudge(now: string) {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: callouts } = await supabase
    .from('truvex.callouts')
    .select('*, role:truvex.roles(name), manager:truvex.profiles(phone, expo_push_token)')
    .eq('status', 'pending_selection')
    .lte('first_accepted_at', fiveMinAgo);

  if (!callouts) return;

  for (const callout of callouts) {
    // Check if we already sent selection_needed for this callout
    const { data: existing } = await supabase
      .from('truvex.notification_log')
      .select('id')
      .eq('callout_id', callout.id)
      .eq('type', 'selection_needed')
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Count acceptors
    const { count } = await supabase
      .from('truvex.callout_responses')
      .select('id', { count: 'exact', head: true })
      .eq('callout_id', callout.id)
      .eq('response', 'accepted');

    const n = count ?? 0;
    const msg = `${n} worker${n === 1 ? '' : 's'} accepted the ${(callout as any).role.name} shift. Please select who will cover.`;
    await notifyUser(callout.manager_id, (callout as any).manager, msg, callout.id, 'selection_needed');
  }
}

// =====================================================================
// 2-minute SMS fallback for unopened push notifications
// =====================================================================
async function handleSMSFallback(now: string) {
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  // Find push notifications sent more than 2 min ago that haven't been opened
  const { data: pendingPush } = await supabase
    .from('truvex.notification_log')
    .select('user_id, callout_id, user:truvex.profiles(phone)')
    .eq('channel', 'push')
    .eq('type', 'callout_posted')
    .is('opened_at', null)
    .lte('sent_at', twoMinAgo);

  if (!pendingPush || pendingPush.length === 0) return;

  for (const log of pendingPush) {
    // Check if SMS already sent for this user+callout
    const { data: existingSms } = await supabase
      .from('truvex.notification_log')
      .select('id')
      .eq('user_id', log.user_id)
      .eq('callout_id', log.callout_id)
      .eq('channel', 'sms')
      .eq('type', 'callout_posted')
      .limit(1);

    if (existingSms && existingSms.length > 0) continue;

    // Get callout details for message
    const { data: callout } = await supabase
      .from('truvex.callouts')
      .select('*, role:truvex.roles(name), location:truvex.locations(name)')
      .eq('id', log.callout_id)
      .single();

    if (!callout || callout.status !== 'open') continue;

    const shiftDate = new Date(callout.shift_date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const startTime = formatTime(callout.start_time);
    const endTime = formatTime(callout.end_time);
    const msg = `New shift available: ${(callout as any).role.name} on ${shiftDate} ${startTime}–${endTime}. Open Truvex to accept.`;

    await sendTwilioSMS((log as any).user.phone, msg);

    await supabase.from('truvex.notification_log').insert({
      user_id: log.user_id,
      callout_id: log.callout_id,
      channel: 'sms',
      type: 'callout_posted',
    });
  }
}

// =====================================================================
// Helpers
// =====================================================================

async function notifyWorker(
  userId: string,
  user: { phone: string; expo_push_token: string | null },
  message: string,
  calloutId: string,
  type: string
) {
  return notifyUser(userId, user, message, calloutId, type);
}

async function notifyUser(
  userId: string,
  user: { phone: string; expo_push_token: string | null },
  message: string,
  calloutId: string | null,
  type: string
) {
  if (user.expo_push_token) {
    await sendExpoPush([user.expo_push_token], message, { callout_id: calloutId });
    await supabase.from('truvex.notification_log').insert({
      user_id: userId,
      callout_id: calloutId,
      channel: 'push',
      type,
    });
  } else {
    await sendTwilioSMS(user.phone, message);
    await supabase.from('truvex.notification_log').insert({
      user_id: userId,
      callout_id: calloutId,
      channel: 'sms',
      type,
    });
  }
}

async function sendExpoPush(tokens: string[], body: string, data: Record<string, unknown>) {
  const messages = tokens.map((to) => ({ to, sound: 'default', body, data, priority: 'high' }));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (EXPO_ACCESS_TOKEN) headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  if (!res.ok) console.error('Expo push failed:', await res.text());
}

async function sendTwilioSMS(to: string, body: string) {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }).toString(),
    }
  );
  if (!res.ok) console.error('Twilio SMS failed:', await res.text());
}

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${minuteStr} ${period}`;
}
