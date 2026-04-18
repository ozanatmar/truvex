-- Missing table in the reset: support_tickets.user_id FKs to profiles
-- without cascade, so deleting profiles fails once any ticket exists.
-- Also covers the per-profile variant.

create or replace function truvex.reset_test_data()
returns void
language plpgsql
security definer
set search_path = truvex, public
as $$
begin
  delete from truvex.notification_log;
  delete from truvex.support_tickets;
  delete from truvex.callout_responses;
  delete from truvex.callouts;
  delete from truvex.worker_roles;
  delete from truvex.location_members;
  delete from truvex.shift_presets;
  delete from truvex.roles;
  delete from truvex.locations;
  delete from truvex.profiles;
  delete from auth.users where phone is not null;
end;
$$;

revoke all on function truvex.reset_test_data() from public, anon, authenticated;

create or replace function truvex.reset_test_profile(p_phone text)
returns void
language plpgsql
security definer
set search_path = truvex, public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from truvex.profiles where phone = p_phone;
  if v_user_id is null then
    return;
  end if;

  delete from truvex.notification_log where user_id = v_user_id;
  delete from truvex.support_tickets where user_id = v_user_id;
  delete from truvex.callout_responses where worker_id = v_user_id;
  delete from truvex.callouts
    where manager_id = v_user_id or assigned_worker_id = v_user_id;
  delete from truvex.worker_roles where user_id = v_user_id;
  delete from truvex.location_members
    where user_id = v_user_id or invited_by = v_user_id;
  delete from truvex.locations where manager_id = v_user_id;
  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function truvex.reset_test_profile(text) from public, anon, authenticated;
