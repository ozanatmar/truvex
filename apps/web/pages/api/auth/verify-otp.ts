import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase';
import { stripe, PLANS } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, token, location_id, tier } = req.body;

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
  if (location_id && tier && (tier === 'starter' || tier === 'pro')) {
    const plan = PLANS[tier as keyof typeof PLANS];

    const { data: location } = await supabaseAdmin
      .from('truvex.locations')
      .select('stripe_customer_id, manager_id, name')
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
        .from('truvex.locations')
        .update({ stripe_customer_id: customerId })
        .eq('id', location_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://truvex.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://truvex.app'}/upgrade?location_id=${location_id}&tier=${tier}`,
      metadata: { location_id, tier },
    });

    return res.status(200).json({ checkoutUrl: session.url });
  }

  res.status(200).json({ ok: true });
}
