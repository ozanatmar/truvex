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

  const { location_id } = req.body ?? {};
  if (!location_id) return res.status(400).json({ error: 'Missing location_id' });

  const resolved = await resolveUserId(req);
  if ('error' in resolved) return res.status(resolved.status).json({ error: resolved.error });

  const { data: location } = await supabaseAdmin
    .schema('truvex')
    .from('locations')
    .select('stripe_subscription_id, manager_id')
    .eq('id', location_id)
    .single();

  if (!location || location.manager_id !== resolved.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (!location.stripe_subscription_id) {
    return res.status(400).json({ error: 'No subscription to reactivate' });
  }

  // Flip off the scheduled cancellation. Stripe keeps the sub live through
  // subscription_period_end and renews as normal from there.
  const updated = await stripe.subscriptions.update(location.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Mirror the real Stripe status back to the DB so the UI refreshes
  // immediately. The customer.subscription.updated webhook will confirm
  // this asynchronously but the user expects an instant response.
  const newStatus =
    updated.status === 'trialing' ? 'trialing' :
    updated.status === 'past_due' ? 'past_due' :
    'active';

  await supabaseAdmin
    .schema('truvex')
    .from('locations')
    .update({ subscription_status: newStatus })
    .eq('id', location_id);

  return res.status(200).json({ ok: true, status: newStatus });
}
