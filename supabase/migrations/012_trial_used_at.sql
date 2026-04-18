-- Track whether a phone account has already consumed its one-time Pro trial.
-- Stored on the profile (not the location) so delete+recreate a location
-- cannot farm another trial.

alter table truvex.profiles
  add column if not exists trial_used_at timestamptz;

-- Backfill: any existing profile that already has a location has clearly
-- already started the product; use the earliest location's created_at so
-- they can't retroactively claim a new trial.
update truvex.profiles p
set trial_used_at = sub.first_created_at
from (
  select manager_id, min(created_at) as first_created_at
  from truvex.locations
  group by manager_id
) sub
where p.id = sub.manager_id
  and p.trial_used_at is null;
