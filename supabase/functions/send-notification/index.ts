import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')!;
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface CalloutRecord {
  id: string;
  location_id: string;
  role_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  open_to_all_roles: boolean;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const record: CalloutRecord = payload.record;

    // Only process new callouts with status 'open'
    if (payload.type !== 'INSERT' || record.status !== 'open') {
      return new Response('skipped', { status: 200 });
    }

    await processCalloutNotification(record);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('send-notification error:', err);
    return new Response(String(err), { status: 500 });
  }
});

async function processCalloutNotification(callout: CalloutRecord) {
  // Get location to check subscription tier
  const { data: location } = await supabase
    .from('truvex.locations')
    .select('subscription_tier, name')
    .eq('id', callout.location_id)
    .single();

  if (!location) return;

  // Free tier: no push/SMS
  if (location.subscription_tier === 'free') {
    console.log(`Location ${callout.location_id} is on free tier — skipping notifications`);
    return;
  }

  // Get role name
  const { data: role } = await supabase
    .from('truvex.roles')
    .select('name')
    .eq('id', callout.role_id)
    .single();

  if (!role) return;

  // Find eligible workers: matching role (or open_to_all_roles), not muted, active
  let membersQuery = supabase
    .from('truvex.location_members')
    .select('user_id, is_muted, user:truvex.profiles(id, phone, expo_push_token)')
    .eq('location_id', callout.location_id)
    .eq('member_type', 'worker')
    .eq('status', 'active')
    .eq('is_muted', false);

  const { data: members } = await membersQuery;
  if (!members || members.length === 0) return;

  let eligibleUserIds: string[];

  if (callout.open_to_all_roles) {
    eligibleUserIds = members.map((m: any) => m.user_id);
  } else {
    // Filter to workers who have the matching role
    const { data: workerRoles } = await supabase
      .from('truvex.worker_roles')
      .select('user_id')
      .eq('location_id', callout.location_id)
      .eq('role_id', callout.role_id);

    const roleUserIds = new Set((workerRoles ?? []).map((wr: any) => wr.user_id));
    eligibleUserIds = members
      .filter((m: any) => roleUserIds.has(m.user_id))
      .map((m: any) => m.user_id);
  }

  if (eligibleUserIds.length === 0) return;

  const eligibleMembers = members.filter((m: any) => eligibleUserIds.includes(m.user_id));

  // Format shift for message
  const shiftDate = new Date(callout.shift_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const startTime = formatTime(callout.start_time);
  const endTime = formatTime(callout.end_time);
  const message = `New shift available: ${role.name} on ${shiftDate} ${startTime}–${endTime}. Open Truvex to accept.`;

  // Send push notifications
  const pushTargets = eligibleMembers.filter((m: any) => m.user?.expo_push_token);
  const smsTargets = eligibleMembers;

  if (pushTargets.length > 0) {
    await sendExpoPush(
      pushTargets.map((m: any) => m.user.expo_push_token!),
      message,
      { callout_id: callout.id }
    );

    // Log push notifications
    const logRows = pushTargets.map((m: any) => ({
      user_id: m.user_id,
      callout_id: callout.id,
      channel: 'push',
      type: 'callout_posted',
    }));
    await supabase.from('truvex.notification_log').insert(logRows);
  }

  // Schedule SMS fallback after 2 minutes
  // In production this would use a delayed queue (pg_cron or Supabase scheduled function)
  // Here we use a setTimeout-equivalent approach with a separate invocation
  // For now, we store pending SMS in notification_log and auto-assign function handles it
  const smsLogRows = smsTargets.map((m: any) => ({
    user_id: m.user_id,
    callout_id: callout.id,
    channel: 'sms',
    type: 'callout_posted',
  }));
  // Mark as pending by not setting sent_at yet — auto-assign will check
  // Actually for 2-min fallback, we'll invoke a delayed edge function
  // Store intent by inserting with a future sent_at
  const twoMinFromNow = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  for (const member of smsTargets) {
    // Only queue SMS for workers who have a push token (fallback for unopened push)
    // Workers without push tokens get SMS immediately
    const hasPush = (member as any).user?.expo_push_token;
    if (!hasPush) {
      await sendTwilioSMS((member as any).user.phone, message);
      await supabase.from('truvex.notification_log').insert({
        user_id: member.user_id,
        callout_id: callout.id,
        channel: 'sms',
        type: 'callout_posted',
      });
    }
    // For push recipients, SMS will be sent by auto-assign function after 2 min
  }
}

async function sendExpoPush(
  tokens: string[],
  body: string,
  data: Record<string, unknown>
) {
  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    body,
    data,
    priority: 'high',
  }));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (EXPO_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.error('Expo push failed:', await res.text());
  }
}

async function sendTwilioSMS(to: string, body: string) {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: body,
      }).toString(),
    }
  );

  if (!res.ok) {
    console.error('Twilio SMS failed:', await res.text());
  }
}

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${minuteStr} ${period}`;
}
