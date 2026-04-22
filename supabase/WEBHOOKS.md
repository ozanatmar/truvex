# Supabase Database Webhooks

The push notification system relies on **four** database webhooks in the Supabase Dashboard. Each one posts the row change to the `send-notification` Edge Function, which dispatches the correct push based on the table + event + diff.

Create these under **Database → Webhooks → Create a new hook**. All four point at the same function URL:

```
https://qiaawqoubyxotelxtnhq.supabase.co/functions/v1/send-notification
```

Method: `POST`. Leave HTTP headers empty (function runs with `verify_jwt = false`).

| # | Name | Table | Events | Conditions | Notification rows handled |
|---|---|---|---|---|---|
| 1 | `callout_posted` | `truvex.callouts` | INSERT | — | Row 1 |
| 2 | `callout_assigned_or_cancelled` | `truvex.callouts` | UPDATE | — | Rows 4a, 4b, 5, 6 |
| 3 | `response_accepted` | `truvex.callout_responses` | INSERT | — | Row 2 |
| 4 | `worker_removed` | `truvex.location_members` | DELETE | — | Rows 7, 8 |

### Notes

- The function inspects `payload.type`, `payload.table`, `payload.record`, and `payload.old_record` to decide which notification to send. An UPDATE that doesn't match (e.g. a muting toggle) is a no-op.
- Webhook #1 already exists from the earlier push testing. Keep it.
- Idempotency: each handler writes to `truvex.notification_log` after dispatch, so double-firing the same event is safe for the cron-driven rows (3, 9) but the UPDATE-based webhooks rely on the state transition and will fire once per valid transition.

## Cron schedule

The `auto-assign` function must run every minute via `pg_cron`:

```sql
select cron.schedule(
  'auto-assign',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://qiaawqoubyxotelxtnhq.supabase.co/functions/v1/auto-assign',
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);
```

It handles:
- 30-minute auto-assignment (DB update only — webhook #2 dispatches the push)
- Row 3: 15-minute no-response escalation
- Row 9: 1-hour shift reminder (skips if worker was assigned within 3 hours of the shift)
