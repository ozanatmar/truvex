import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { stripe } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, token, location_id } = req.body;
  if (!phone || !token || !location_id) return res.status(400).json({ error: 'Missing fields' });

  // Verify OTP
  const { data: authData, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (error || !authData.user) {
    return res.status(400).json({ error: error?.message ?? 'Invalid code' });
  }

  // Get location
  const { data: location } = await supabaseAdmin
    .schema('truvex')
    .from('locations')
    .select('stripe_customer_id, stripe_subscription_id, manager_id')
    .eq('id', location_id)
    .single();

  if (!location || location.manager_id !== authData.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (!location.stripe_subscription_id) {
    return res.status(400).json({ error: 'No active subscription' });
  }

  // Cancel at period end (not immediately)
  await stripe.subscriptions.update(location.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // The webhook will update the DB when the period ends.
  // Update subscription_status to 'cancelled' immediately so the app reflects it.
  await supabaseAdmin
    .schema('truvex')
    .from('locations')
    .update({ subscription_status: 'cancelled' })
    .eq('id', location_id);

  return res.status(200).json({ ok: true });
}
