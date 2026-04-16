-- Rename subscription tiers: starter → pro, pro → business
-- Rename the top tier first to prevent a constraint collision when the middle tier moves up.

ALTER TABLE truvex.locations DROP CONSTRAINT IF EXISTS locations_subscription_tier_check;

UPDATE truvex.locations SET subscription_tier = 'business' WHERE subscription_tier = 'pro';
UPDATE truvex.locations SET subscription_tier = 'pro'      WHERE subscription_tier = 'starter';

ALTER TABLE truvex.locations
  ADD CONSTRAINT locations_subscription_tier_check
  CHECK (subscription_tier = ANY (ARRAY['free'::text, 'pro'::text, 'business'::text]));
