-- Allow deleting callouts (and their locations) without leaving orphan
-- notification_log rows. Logs are audit data, not business-critical — losing
-- them when the location is deleted is fine.

alter table truvex.notification_log
  drop constraint if exists notification_log_callout_id_fkey;

alter table truvex.notification_log
  add constraint notification_log_callout_id_fkey
  foreign key (callout_id) references truvex.callouts(id) on delete cascade;

alter table truvex.notification_log
  drop constraint if exists notification_log_user_id_fkey;

alter table truvex.notification_log
  add constraint notification_log_user_id_fkey
  foreign key (user_id) references truvex.profiles(id) on delete cascade;
