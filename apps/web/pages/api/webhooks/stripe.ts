import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { stripe } from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: false } };

async function updateLocationSubscription(
  customerId: string,
  updates: Record<string, unknown>
) {
  await supabaseAdmin
    .schema('truvex')
    .from('locations')
    .update(updates)
    .eq('stripe_customer_id', customerId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  switch (event.type) {
    // Checkout completed — first subscription created
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const locationId = session.metadata?.location_id;
      const tier = session.metadata?.tier;

      if (locationId && tier && session.subscription) {
        // Retrieve full subscription to get period_end and status
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);

        await supabaseAdmin
          .schema('truvex')
          .from('locations')
          .update({
            subscription_tier: tier,
            subscription_status: sub.status === 'trialing' ? 'trialing' : 'active',
            stripe_subscription_id: sub.id,
            subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('id', locationId);
      }
      break;
    }

    // Subscription state changed (renewal, payment failure, cancellation scheduled, etc.)
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      // Determine tier from price metadata or existing record
      let tier: string | null = null;
      const priceId = sub.items.data[0]?.price?.id;
      if (
        priceId === process.env.STRIPE_BUSINESS_PRICE_ID ||
        priceId === process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID
      ) {
        tier = 'business';
      } else if (
        priceId === process.env.STRIPE_PRO_PRICE_ID ||
        priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID
      ) {
        tier = 'pro';
      }

      // Map Stripe status to our subscription_status
      // Stripe statuses: trialing, active, past_due, canceled, unpaid, incomplete, incomplete_expired, paused
      const statusMap: Record<string, string> = {
        trialing: 'trialing',
        active: 'active',
        past_due: 'past_due',
        canceled: 'cancelled',
        unpaid: 'past_due',
        incomplete: 'past_due',
        incomplete_expired: 'expired',
        paused: 'active',
      };
      const newStatus = statusMap[sub.status] ?? 'active';

      // If cancel_at_period_end is set, we mark as cancelled but access continues
      const effectiveStatus = sub.cancel_at_period_end ? 'cancelled' : newStatus;

      const updates: Record<string, unknown> = {
        subscription_status: effectiveStatus,
        stripe_subscription_id: sub.id,
        subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      };

      // Only update tier if we can determine it (don't downgrade mid-cycle)
      if (tier && (sub.status === 'active' || sub.status === 'trialing')) {
        updates.subscription_tier = tier;
      }

      // Downgrade tier when status is bad
      if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
        updates.subscription_tier = 'free';
      }

      await updateLocationSubscription(customerId, updates);
      break;
    }

    // Subscription fully deleted (not just cancelled at period end — actually ended)
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      await updateLocationSubscription(customerId, {
        subscription_tier: 'free',
        subscription_status: 'expired',
        stripe_subscription_id: null,
        subscription_period_end: null,
      });
      break;
    }

    // Payment succeeded — ensure status is active
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === 'subscription_create') break; // handled by checkout.session.completed

      const customerId = invoice.customer as string;
      const subId = invoice.subscription as string;

      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await updateLocationSubscription(customerId, {
          subscription_status: 'active',
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
      }
      break;
    }

    // Payment failed
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      await updateLocationSubscription(customerId, {
        subscription_status: 'past_due',
      });
      break;
    }

    // Trial ending soon — could send a notification here in future
    case 'customer.subscription.trial_will_end': {
      // No-op for now; the mobile app already shows trial countdown
      break;
    }
  }

  res.status(200).json({ received: true });
}
