-- notification_log.type was missing four types the Edge Functions actually
-- write: first_acceptance (row 2), selected_auto (row 4b), worker_removed_self
-- (row 8), worker_removed_manager (row 7). Same silent-rejection pattern as
-- migration 021 — the push was sent successfully but the log insert failed the
-- check constraint, so the row never landed. That broke audit visibility and,
-- for types with idempotency guards, would have caused re-fires.
--
-- Sweep the full list in one place so this can't recur: every string any
-- notification dispatcher writes must be listed here.

alter table truvex.notification_log
  drop constraint if exists notification_log_type_check;

alter table truvex.notification_log
  add constraint notification_log_type_check
  check (type = any (array[
    'callout_posted',
    'selection_needed',
    'first_acceptance',
    'selected',
    'selected_auto',
    'not_selected',
    'shift_filled',
    'shift_cancelled',
    'no_response_escalation',
    'shift_reminder',
    'worker_removed_self',
    'worker_removed_manager'
  ]));
