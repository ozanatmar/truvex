import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { stripe } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, token, location_id, return_to } = req.body;
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
    .select('stripe_customer_id, manager_id')
    .eq('id', location_id)
    .single();

  if (!location || location.manager_id !== authData.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (!location.stripe_customer_id) {
    return res.status(400).json({ error: 'No subscription found' });
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const originFromReq = host ? `${proto}://${host}` : null;
  const rawAppUrl = originFromReq ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://truvex.app';
  const appUrl = /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`;

  const returnUrl = return_to
    ? `${appUrl}/subscription/return?return_to=${encodeURIComponent(return_to)}`
    : `${appUrl}/subscription/return`;

  const session = await stripe.billingPortal.sessions.create({
    customer: location.stripe_customer_id,
    return_url: returnUrl,
  });

  return res.status(200).json({ portalUrl: session.url });
}
