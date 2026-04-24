-- notification_log.type was missing 'shift_reminder'. The row 9 cron writes
-- rows of that type every time it fires, but the insert was silently failing
-- the check constraint — which defeated the idempotency guard and caused the
-- reminder to re-fire every minute inside the 50-70 min window.

alter table truvex.notification_log
  drop constraint if exists notification_log_type_check;

alter table truvex.notification_log
  add constraint notification_log_type_check
  check (type = any (array[
    'callout_posted',
    'selection_needed',
    'selected',
    'not_selected',
    'shift_filled',
    'shift_cancelled',
    'no_response_escalation',
    'shift_reminder'
  ]));
