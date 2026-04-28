-- Add 'worker_added' to the notification_log type check constraint (row 0b)
ALTER TABLE truvex.notification_log
  DROP CONSTRAINT notification_log_type_check;

ALTER TABLE truvex.notification_log
  ADD CONSTRAINT notification_log_type_check CHECK (type = ANY (ARRAY[
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
    'worker_removed_manager',
    'worker_added'
  ]));
