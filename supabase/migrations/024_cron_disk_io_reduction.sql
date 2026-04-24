-- Reduce pg_cron / pg_net disk IO load.
--
-- Context: Supabase flagged the project for depleting its Disk IO budget.
-- Investigation found:
--   - 'truvex-auto-assign' (legacy, created in the dashboard before
--     migration 023) and 'auto-assign' (migration 023) were functional
--     duplicates — both posted to /functions/v1/auto-assign every minute.
--   - auto-assign's tightest timing constraint is the 1-hour shift reminder,
--     which fires inside a 50–70 min window with notification_log dedup.
--     Every-5-min cadence stays well inside that window.
--   - expire-trials was scheduled every minute, but auto-assign's
--     isPaidOrTrialing() already time-checks trial_ends_at directly, so
--     the status flip can lag by up to an hour with no user-facing effect.
--   - net._http_response (24 MB) and cron.job_run_details (8 MB) had no
--     pruning policy and were accumulating indefinitely.

-- 1. Drop the legacy duplicate and re-schedule auto-assign at 5-min cadence.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'truvex-auto-assign') then
    perform cron.unschedule('truvex-auto-assign');
  end if;
  if exists (select 1 from cron.job where jobname = 'auto-assign') then
    perform cron.unschedule('auto-assign');
  end if;
end
$$;

select cron.schedule(
  'auto-assign',
  '*/5 * * * *',
  $$select net.http_post(
    url := 'https://qiaawqoubyxotelxtnhq.supabase.co/functions/v1/auto-assign',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) as request_id;$$
);

-- 2. Switch expire-trials to hourly and rename so the jobname isn't a lie.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-trials-every-minute') then
    perform cron.unschedule('expire-trials-every-minute');
  end if;
  if exists (select 1 from cron.job where jobname = 'expire-trials-hourly') then
    perform cron.unschedule('expire-trials-hourly');
  end if;
end
$$;

select cron.schedule(
  'expire-trials-hourly',
  '0 * * * *',
  $$select net.http_post(
    url := 'https://qiaawqoubyxotelxtnhq.supabase.co/functions/v1/expire-trials',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) as request_id;$$
);

-- 3. One-shot cleanup of accumulated pg_net responses and cron history.
delete from net._http_response where created < now() - interval '3 days';
delete from cron.job_run_details where start_time < now() - interval '7 days';

-- 4. Nightly cleanup so these tables don't grow unbounded again.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-pg-logs') then
    perform cron.unschedule('cleanup-pg-logs');
  end if;
end
$$;

select cron.schedule(
  'cleanup-pg-logs',
  '15 3 * * *',
  $$
    delete from net._http_response where created < now() - interval '3 days';
    delete from cron.job_run_details where start_time < now() - interval '7 days';
  $$
);
