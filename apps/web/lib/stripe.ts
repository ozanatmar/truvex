import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  starter: {
    name: 'Pro',
    price: '$49/month',
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    workerLimit: 30,
  },
  pro: {
    name: 'Business',
    price: '$99/month',
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    workerLimit: null, // unlimited
  },
} as const;
