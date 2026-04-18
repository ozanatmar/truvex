-- Schedule expire-trials Edge Function to run every minute.
-- Flips trialing locations whose trial_ends_at has passed over to
-- subscription_status='expired' when no Stripe subscription is attached.

select cron.schedule(
  'expire-trials-every-minute',
  '* * * * *',
  $$select net.http_post(
    url := 'https://qiaawqoubyxotelxtnhq.supabase.co/functions/v1/expire-trials',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) as request_id;$$
);
