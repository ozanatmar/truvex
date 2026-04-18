import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { stripe, PLANS, PlanTier, BillingType } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
  const { phone, token, location_id, tier, billing } = req.body;

  if (!phone || !token) return res.status(400).json({ error: 'Missing fields' });

  // Verify OTP
  const { data: authData, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (error || !authData.user) {
    return res.status(400).json({ error: error?.message ?? 'Invalid code' });
  }

  // If location_id and tier provided, create Stripe checkout session
  if (location_id && tier && (tier === 'pro' || tier === 'business')) {
    const plan = PLANS[tier as PlanTier];
    const billingType: BillingType = billing === 'annual' ? 'annual' : 'monthly';
    const priceId = plan.priceIds[billingType];

    const { data: location } = await supabaseAdmin
      .schema('truvex')
      .from('locations')
      .select('stripe_customer_id, manager_id, name, trial_ends_at, subscription_status')
      .eq('id', location_id)
      .single();

    if (!location || location.manager_id !== authData.user.id) {
      return res.status(403).json({ error: 'Not authorized for this location' });
    }

    let customerId = location.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        phone,
        metadata: { supabase_user_id: authData.user.id, location_id },
        description: location.name,
      });
      customerId = customer.id;

      await supabaseAdmin
        .schema('truvex')
        .from('locations')
        .update({ stripe_customer_id: customerId })
        .eq('id', location_id);
    }

    // Carry over any remaining trial days. Stripe requires `trial_end` to be at
    // least 48h in the future when passed on a Checkout Session; under that, omit
    // it and let the sub bill immediately. Keeps the short-trial dev flow working.
    const MIN_TRIAL_END_MS_AHEAD = 48 * 60 * 60 * 1000;
    let trialEnd: number | undefined;
    if (location.subscription_status === 'trialing' && location.trial_ends_at) {
      const trialEndsAt = new Date(location.trial_ends_at).getTime();
      const remainingMs = trialEndsAt - Date.now();
      if (remainingMs >= MIN_TRIAL_END_MS_AHEAD) {
        trialEnd = Math.floor(trialEndsAt / 1000);
      }
    }

    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://truvex.app';
    const appUrl = /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: trialEnd ? { trial_end: trialEnd } : undefined,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade?location_id=${location_id}&tier=${tier}&billing=${billingType}`,
      metadata: { location_id, tier, billing: billingType },
    });

    return res.status(200).json({ checkoutUrl: session.url });
  }

  res.status(200).json({ ok: true });
  } catch (err) {
    console.error('verify-otp handler error:', err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
