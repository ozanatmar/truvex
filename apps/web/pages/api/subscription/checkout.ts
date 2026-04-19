import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { stripe, PLANS, PlanTier, BillingType } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const accessToken = authHeader.slice('Bearer '.length);

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData.user) {
      return res.status(401).json({ error: userErr?.message ?? 'Invalid session' });
    }
    const userId = userData.user.id;
    const userPhone = userData.user.phone ?? '';

    const { location_id, tier, billing, return_to } = req.body ?? {};
    if (!location_id || !tier || (tier !== 'pro' && tier !== 'business')) {
      return res.status(400).json({ error: 'Missing or invalid location_id/tier' });
    }

    const plan = PLANS[tier as PlanTier];
    const billingType: BillingType = billing === 'annual' ? 'annual' : 'monthly';
    const priceId = plan.priceIds[billingType];
    if (!priceId) {
      const envVar = `STRIPE_${tier.toUpperCase()}_${billingType === 'annual' ? 'ANNUAL' : 'MONTHLY'}_PRICE_ID`;
      return res.status(500).json({ error: `Missing ${envVar} env var on the server` });
    }

    const { data: location } = await supabaseAdmin
      .schema('truvex')
      .from('locations')
      .select('stripe_customer_id, manager_id, name, trial_ends_at, subscription_status')
      .eq('id', location_id)
      .single();

    if (!location || location.manager_id !== userId) {
      return res.status(403).json({ error: 'Not authorized for this location' });
    }

    let customerId = location.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        phone: userPhone || undefined,
        metadata: { supabase_user_id: userId, location_id },
        description: location.name,
      });
      customerId = customer.id;

      await supabaseAdmin
        .schema('truvex')
        .from('locations')
        .update({ stripe_customer_id: customerId })
        .eq('id', location_id);
    }

    // Carry over remaining trial days — Pro only. Business tier is never
    // discounted and must charge from day one. Stripe requires >=48h ahead
    // or the trial_end is rejected; if less, omit it (subscription starts
    // billing immediately, which is acceptable for a near-expired trial).
    const MIN_TRIAL_END_MS_AHEAD = 48 * 60 * 60 * 1000;
    let trialEnd: number | undefined;
    if (tier === 'pro' && location.subscription_status === 'trialing' && location.trial_ends_at) {
      const trialEndsAt = new Date(location.trial_ends_at).getTime();
      if (trialEndsAt - Date.now() >= MIN_TRIAL_END_MS_AHEAD) {
        trialEnd = Math.floor(trialEndsAt / 1000);
      }
    }

    const host = req.headers['x-forwarded-host'] ?? req.headers.host;
    const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
    const originFromReq = host ? `${proto}://${host}` : null;
    const rawAppUrl = originFromReq ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://truvex.app';
    const appUrl = /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: trialEnd ? { trial_end: trialEnd } : undefined,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}${return_to ? `&return_to=${encodeURIComponent(return_to)}` : ''}`,
      cancel_url: `${appUrl}/upgrade?location_id=${location_id}&tier=${tier}&billing=${billingType}`,
      metadata: { location_id, tier, billing: billingType },
    });

    return res.status(200).json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('checkout handler error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
