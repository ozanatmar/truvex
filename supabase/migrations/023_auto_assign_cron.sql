-- Schedule auto-assign Edge Function to run every minute.
-- Handles three things:
--   1. 30-minute auto-assignment for callouts stuck in pending_selection
--      (DB update only — webhook #2 fires the push)
--   2. Row 3: 15-minute no-response escalation to the manager
--   3. Row 9: 1-hour shift reminder to the assigned worker
--
-- The job was originally scheduled directly in the Supabase dashboard with
-- jobname 'auto-assign'. This migration captures that schedule in source so
-- it's reproducible when the Truvex schema is migrated to its own Supabase
-- project at launch. cron.unschedule is wrapped in a DO block so the migration
-- is idempotent whether or not the job already exists.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto-assign') then
    perform cron.unschedule('auto-assign');
  end if;
end
$$;

select cron.schedule(
  'auto-assign',
  '* * * * *',
  $$select net.http_post(
    url := 'https://qiaawqoubyxotelxtnhq.supabase.co/functions/v1/auto-assign',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) as request_id;$$
);
