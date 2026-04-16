import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  pro: {
    name: 'Pro',
    workerLimit: 30,
    priceIds: {
      monthly: process.env.STRIPE_PRO_PRICE_ID ?? '',
      annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? '',
    },
  },
  business: {
    name: 'Business',
    workerLimit: null, // unlimited
    priceIds: {
      monthly: process.env.STRIPE_BUSINESS_PRICE_ID ?? '',
      annual: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID ?? '',
    },
  },
} as const;

export type PlanTier = keyof typeof PLANS;
export type BillingType = 'monthly' | 'annual';
