import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { stripe, PLANS, PlanTier, BillingType } from '../../../lib/stripe';

// Swaps the single price on an existing Stripe subscription. Stripe's default
// proration_behavior='create_prorations' credits the unused portion of the
// current price against the new one — works the same for monthly and annual.
// Do NOT route mid-subscription upgrades through /checkout: that creates a
// second subscription on the same customer and double-bills.
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

    const { location_id, tier } = req.body ?? {};
    if (!location_id || !tier || (tier !== 'pro' && tier !== 'business')) {
      return res.status(400).json({ error: 'Missing or invalid location_id/tier' });
    }

    const { data: location } = await supabaseAdmin
      .schema('truvex')
      .from('locations')
      .select('manager_id, stripe_subscription_id')
      .eq('id', location_id)
      .single();

    if (!location || location.manager_id !== userId) {
      return res.status(403).json({ error: 'Not authorized for this location' });
    }
    if (!location.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription to change' });
    }

    const sub = await stripe.subscriptions.retrieve(location.stripe_subscription_id);
    const currentItem = sub.items.data[0];
    if (!currentItem) {
      return res.status(500).json({ error: 'Subscription has no items' });
    }
    const currentPriceId = currentItem.price.id;

    // Derive the current billing cadence from the existing price so a Pro
    // annual upgrades to Business annual (not Business monthly). Fall back to
    // monthly if we can't identify it, but log — this would mean the sub is
    // on a price that isn't in our env map.
    let currentCadence: BillingType | null = null;
    for (const planKey of Object.keys(PLANS) as PlanTier[]) {
      const ids = PLANS[planKey].priceIds;
      if (ids.monthly === currentPriceId) currentCadence = 'monthly';
      else if (ids.annual === currentPriceId) currentCadence = 'annual';
      if (currentCadence) break;
    }
    if (!currentCadence) {
      console.warn(`[change-plan] unknown current priceId=${currentPriceId}; defaulting to monthly`);
      currentCadence = 'monthly';
    }

    const targetPriceId = PLANS[tier as PlanTier].priceIds[currentCadence];
    if (!targetPriceId) {
      const envVar = `STRIPE_${tier.toUpperCase()}_${currentCadence === 'annual' ? 'ANNUAL' : 'MONTHLY'}_PRICE_ID`;
      return res.status(500).json({ error: `Missing ${envVar} env var on the server` });
    }

    if (targetPriceId === currentPriceId) {
      return res.status(200).json({ ok: true, unchanged: true });
    }

    // Upgrading during the Pro trial would otherwise give the user up to 14
    // days of Business access for free (they can cancel before trial_end and
    // pay nothing), because Stripe doesn't bill while a subscription is in
    // trial. End the trial on upgrade so the proration invoice finalizes and
    // charges immediately — "want Business now? you're paying now."
    const endTrialNow = sub.status === 'trialing';

    // Replace the single price item. proration_behavior defaults to
    // 'create_prorations' which issues credit/charge lines on the next invoice.
    // billing_cycle_anchor='unchanged' keeps the existing renewal date so the
    // user isn't reset to a fresh cycle on upgrade. payment_behavior
    // 'error_if_incomplete' makes the API call fail (so we don't flip the DB)
    // if the card is declined when the trial is ended here.
    const updated = await stripe.subscriptions.update(location.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: targetPriceId }],
      proration_behavior: 'create_prorations',
      billing_cycle_anchor: 'unchanged',
      ...(endTrialNow ? { trial_end: 'now' as const, payment_behavior: 'error_if_incomplete' as const } : {}),
    });

    // Webhook customer.subscription.updated / invoice.payment_succeeded will
    // mirror back to the DB, but write here too so the UI reflects the change
    // immediately. If we ended the trial, flip status='active' and clear the
    // trial_ends_at so the trial UI stops rendering.
    const dbUpdate: Record<string, unknown> = {
      subscription_tier: tier,
      subscription_period_end: updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
    };
    if (endTrialNow) {
      dbUpdate.subscription_status = updated.status === 'active' ? 'active' : updated.status;
      dbUpdate.trial_ends_at = null;
    }

    await supabaseAdmin
      .schema('truvex')
      .from('locations')
      .update(dbUpdate)
      .eq('id', location_id);

    return res.status(200).json({ ok: true, tier, billing: currentCadence, trialEnded: endTrialNow });
  } catch (err) {
    console.error('change-plan handler error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
