-- Workers can't SELECT or UPDATE location_members rows with user_id IS NULL
-- under the worker-scoped RLS policy (user_id = auth.uid()), so they can't
-- claim invites from the client. SECURITY DEFINER wraps the update + the
-- worker_roles insert in one trusted call.

create or replace function truvex.claim_pending_invites()
returns integer
language plpgsql
security definer
set search_path = truvex, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_phone   text;
  v_claimed integer := 0;
  invite    record;
begin
  if v_user_id is null then
    return 0;
  end if;

  select phone into v_phone from truvex.profiles where id = v_user_id;
  if v_phone is null then
    return 0;
  end if;

  for invite in
    select id, location_id, primary_role_id, additional_role_ids
    from truvex.location_members
    where invited_phone = v_phone and user_id is null
  loop
    -- Keep invited_phone populated so the manager's team list can show
    -- the worker's phone. Managers can't read truvex.profiles for other
    -- users under RLS, so invited_phone is the only manager-visible copy.
    update truvex.location_members
       set user_id = v_user_id,
           status = 'active'
     where id = invite.id;

    if invite.primary_role_id is not null then
      insert into truvex.worker_roles (location_id, user_id, role_id, is_primary)
      values (invite.location_id, v_user_id, invite.primary_role_id, true)
      on conflict (location_id, user_id, role_id)
        do update set is_primary = true;
    end if;

    if invite.additional_role_ids is not null then
      insert into truvex.worker_roles (location_id, user_id, role_id, is_primary)
      select invite.location_id, v_user_id, rid, false
      from unnest(invite.additional_role_ids) as rid
      where rid is not null
      on conflict (location_id, user_id, role_id) do nothing;
    end if;

    v_claimed := v_claimed + 1;
  end loop;

  return v_claimed;
end;
$$;

grant execute on function truvex.claim_pending_invites() to authenticated;
