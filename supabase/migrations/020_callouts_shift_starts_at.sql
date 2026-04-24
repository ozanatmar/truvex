-- Add callouts.shift_starts_at so the 1-hour reminder cron can compare against
-- a real timestamptz instead of parsing (shift_date + start_time) as UTC.
--
-- The old approach treated wall-clock values as UTC, which meant the reminder
-- fired at the wrong moment for anyone outside UTC. The client now computes
-- the full local timestamp at post time using the manager's device tz and
-- writes it here; the cron reads it directly.
--
-- Nullable so pre-existing callouts don't break. The cron falls back to the
-- naive UTC parse for rows with null shift_starts_at — those will be flushed
-- through history soon enough.

alter table truvex.callouts
  add column if not exists shift_starts_at timestamptz;

create index if not exists callouts_shift_starts_at_idx
  on truvex.callouts (shift_starts_at)
  where shift_starts_at is not null and status = 'filled';
