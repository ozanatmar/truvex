-- Restrict is_muted changes to the worker themselves.
-- Managers have "full access" to their location's members via RLS, which lets
-- them edit any column including is_muted. The app no longer exposes a
-- manager-facing mute toggle, but we enforce the same rule at the database
-- level so a determined manager can't flip is_muted via a direct API call.
--
-- Approach: BEFORE UPDATE trigger on location_members. If is_muted is being
-- changed, allow only when the current auth.uid() matches the row's user_id
-- (the worker themselves). Service-role / cron / SECURITY DEFINER functions
-- run with auth.uid() = NULL and bypass the check so backfills and
-- Edge Functions still work.

create or replace function truvex.enforce_is_muted_worker_only()
returns trigger
language plpgsql
security definer
set search_path = truvex, pg_temp
as $$
begin
  if old.is_muted is distinct from new.is_muted then
    -- Service role / internal callers have no auth.uid() — let them through.
    if auth.uid() is null then
      return new;
    end if;

    -- Only the worker themselves can change their own mute state.
    if auth.uid() is distinct from new.user_id then
      raise exception 'Only the worker can change their own mute state'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_is_muted_worker_only on truvex.location_members;

create trigger enforce_is_muted_worker_only
  before update of is_muted on truvex.location_members
  for each row
  execute function truvex.enforce_is_muted_worker_only();
