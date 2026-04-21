-- Add callouts and callout_responses to the supabase_realtime publication
-- so manager and worker clients receive live updates via postgres_changes.
--
-- Without this, the Realtime subscriptions in the app compile and run but
-- never fire: the manager callout detail screen only showed new acceptances
-- after a manual reload. Acceptor list, status changes, and auto-assignment
-- all depend on these two tables being replicated.
--
-- Idempotent: pg_publication_tables lookup guards against re-adding.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'truvex'
      and tablename = 'callouts'
  ) then
    alter publication supabase_realtime add table truvex.callouts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'truvex'
      and tablename = 'callout_responses'
  ) then
    alter publication supabase_realtime add table truvex.callout_responses;
  end if;
end $$;
