import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { stripe } from '../../../lib/stripe';

async function resolveUserId(req: NextApiRequest): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return { error: error?.message ?? 'Invalid session', status: 401 };
    return { userId: data.user.id };
  }

  const { phone, token } = req.body ?? {};
  if (!phone || !token) return { error: 'Missing fields', status: 400 };
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error || !data.user) return { error: error?.message ?? 'Invalid code', status: 400 };
  return { userId: data.user.id };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { location_id, return_to } = req.body ?? {};
  if (!location_id) return res.status(400).json({ error: 'Missing location_id' });

  const resolved = await resolveUserId(req);
  if ('error' in resolved) return res.status(resolved.status).json({ error: resolved.error });

  const { data: location } = await supabaseAdmin
    .schema('truvex')
    .from('locations')
    .select('stripe_customer_id, manager_id')
    .eq('id', location_id)
    .single();

  if (!location || location.manager_id !== resolved.userId) {
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
