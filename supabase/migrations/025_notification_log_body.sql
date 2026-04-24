-- Store the rendered message body in notification_log so the SMS fallback job
-- in auto-assign can resend the same text without re-joining all related tables.
-- Existing push rows will have body = NULL and are excluded from SMS fallback
-- by the NOT NULL filter in handleSmsFallback.
alter table truvex.notification_log
  add column if not exists body text;
