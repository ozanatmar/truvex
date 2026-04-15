import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { stripe } from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: false } };

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
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const locationId = session.metadata?.location_id;
      const tier = session.metadata?.tier;

      if (locationId && tier && session.subscription) {
        await supabaseAdmin
          .from('truvex.locations')
          .update({
            subscription_tier: tier,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', locationId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const tierMap: Record<string, string> = {
        active: sub.items.data[0]?.price?.metadata?.tier ?? 'starter',
        past_due: 'free',
        canceled: 'free',
        unpaid: 'free',
      };

      const newTier = tierMap[sub.status] ?? 'free';

      await supabaseAdmin
        .from('truvex.locations')
        .update({ subscription_tier: newTier, stripe_subscription_id: sub.id })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      await supabaseAdmin
        .from('truvex.locations')
        .update({ subscription_tier: 'free', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId);
      break;
    }
  }

  res.status(200).json({ received: true });
}
