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

  console.log(
    `[stripe-webhook] ${event.type} id=${event.id} ` +
      `priceIdsConfigured={pro_m:${!!process.env.STRIPE_PRO_MONTHLY_PRICE_ID},` +
      `pro_a:${!!process.env.STRIPE_PRO_ANNUAL_PRICE_ID},` +
      `biz_m:${!!process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID},` +
      `biz_a:${!!process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID}}`,
  );

  switch (event.type) {
    // Checkout completed — first subscription created
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const locationId = session.metadata?.location_id;
      const tier = session.metadata?.tier;

      console.log(
        `[stripe-webhook] checkout.session.completed locationId=${locationId} tier=${tier} subscription=${session.subscription} mode=${session.mode}`,
      );

      if (!locationId || !tier || !session.subscription) {
        console.warn(
          '[stripe-webhook] checkout.session.completed missing fields — skipping DB update',
        );
        break;
      }

      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const periodEnd = (sub as any).current_period_end
        ?? (sub as any).items?.data?.[0]?.current_period_end;

      const isTrialing = sub.status === 'trialing';
      const { error, data } = await supabaseAdmin
        .schema('truvex')
        .from('locations')
        .update({
          subscription_tier: tier,
          subscription_status: isTrialing ? 'trialing' : 'active',
          stripe_subscription_id: sub.id,
          subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          // A direct-paid subscription (e.g. Business picked during the 14-day
          // free trial) starts with sub.status='active' — clear the carried-over
          // trial_ends_at so the trial UI never renders over a paid plan.
          ...(isTrialing ? {} : { trial_ends_at: null }),
        })
        .eq('id', locationId)
        .select();

      if (error) {
        console.error('[stripe-webhook] checkout.session.completed update error:', error);
      } else {
        console.log(
          `[stripe-webhook] checkout.session.completed updated ${data?.length ?? 0} row(s) tier=${tier}`,
        );
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price?.id ?? '';

      const priceTierMap: Record<string, string> = {
        [process.env.STRIPE_PRO_MONTHLY_PRICE_ID      ?? '__']: 'pro',
        [process.env.STRIPE_PRO_ANNUAL_PRICE_ID       ?? '__']: 'pro',
        [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? '__']: 'business',
        [process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID  ?? '__']: 'business',
      };

      const tierFromPrice = priceTierMap[priceId];
      const isLive = ['active', 'trialing'].includes(sub.status);

      console.log(
        `[stripe-webhook] customer.subscription.updated sub=${sub.id} priceId=${priceId} tierFromPrice=${tierFromPrice} status=${sub.status} isLive=${isLive}`,
      );

      // Only update tier while the subscription is live AND the price is known.
      // Keeps the paid tier during cancel_at_period_end grace period (still active).
      // customer.subscription.deleted owns the terminal flip to 'free'.
      if (isLive && tierFromPrice) {
        const { error, data } = await supabaseAdmin
          .schema('truvex')
          .from('locations')
          .update({ subscription_tier: tierFromPrice, stripe_subscription_id: sub.id })
          .eq('stripe_customer_id', customerId)
          .select();

        if (error) {
          console.error('[stripe-webhook] customer.subscription.updated error:', error);
        } else {
          console.log(
            `[stripe-webhook] customer.subscription.updated set tier=${tierFromPrice} on ${data?.length ?? 0} row(s)`,
          );
        }
      } else {
        console.log(
          `[stripe-webhook] customer.subscription.updated skipped (isLive=${isLive}, tierFromPrice=${tierFromPrice})`,
        );
      }
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
          // First paid invoice means the trial (if any) is over — clear the
          // trial_ends_at so the settings UI stops rendering the trial block.
          trial_ends_at: null,
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
