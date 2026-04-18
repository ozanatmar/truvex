// Centralised subscription gating. A location's `subscription_tier` stays
// 'free' during a Pro trial — Pro features are granted via `subscription_status`
// === 'trialing' until trial_ends_at. Paid upgrade flips tier to pro/business.

type LocLike = {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
} | null | undefined;

function trialActive(loc: LocLike): boolean {
  if (!loc || loc.subscription_status !== 'trialing' || !loc.trial_ends_at) return false;
  return new Date(loc.trial_ends_at).getTime() > Date.now();
}

export function hasProFeatures(loc: LocLike): boolean {
  if (!loc) return false;
  if (loc.subscription_tier === 'pro' || loc.subscription_tier === 'business') return true;
  return trialActive(loc);
}

export function hasBusinessFeatures(loc: LocLike): boolean {
  return loc?.subscription_tier === 'business';
}

// The tier of features currently available — NOT necessarily what `subscription_tier`
// is set to in the DB. During a trial this returns 'pro' even though tier='free'.
export function effectiveTier(loc: LocLike): 'free' | 'pro' | 'business' {
  if (loc?.subscription_tier === 'business') return 'business';
  if (loc?.subscription_tier === 'pro') return 'pro';
  if (trialActive(loc)) return 'pro';
  return 'free';
}

export function workerLimit(loc: LocLike): number | null {
  const t = effectiveTier(loc);
  if (t === 'business') return null;
  if (t === 'pro') return 30;
  return 10;
}

export function trialDaysLeft(loc: LocLike): number | null {
  if (!loc?.trial_ends_at) return null;
  const diffMs = new Date(loc.trial_ends_at).getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isTrialing(loc: LocLike): boolean {
  return trialActive(loc);
}
