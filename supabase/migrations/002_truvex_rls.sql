-- Truvex RLS policies migration 002

-- Enable RLS on all tables
alter table truvex.profiles enable row level security;
alter table truvex.locations enable row level security;
alter table truvex.location_members enable row level security;
alter table truvex.roles enable row level security;
alter table truvex.worker_roles enable row level security;
alter table truvex.callouts enable row level security;
alter table truvex.callout_responses enable row level security;
alter table truvex.notification_log enable row level security;

-- =====================================================================
-- profiles
-- Users can only read/write their own row.
-- =====================================================================
create policy "profiles: own row read"
  on truvex.profiles for select
  using (auth.uid() = id);

create policy "profiles: own row update"
  on truvex.profiles for update
  using (auth.uid() = id);

create policy "profiles: insert own row"
  on truvex.profiles for insert
  with check (auth.uid() = id);

-- Service role bypass (for edge functions creating placeholder profiles)
create policy "profiles: service role all"
  on truvex.profiles for all
  using (auth.role() = 'service_role');

-- =====================================================================
-- locations
-- Manager: full access to their location.
-- Workers: read-only access to locations they're members of.
-- =====================================================================
create policy "locations: manager full access"
  on truvex.locations for all
  using (auth.uid() = manager_id)
  with check (auth.uid() = manager_id);

create policy "locations: worker read"
  on truvex.locations for select
  using (
    exists (
      select 1 from truvex.location_members
      where location_id = truvex.locations.id
        and user_id = auth.uid()
        and member_type = 'worker'
        and status = 'active'
    )
  );

-- =====================================================================
-- location_members
-- Manager: full access to members of their location.
-- Workers: read their own memberships.
-- =====================================================================
create policy "location_members: manager full access"
  on truvex.location_members for all
  using (
    exists (
      select 1 from truvex.locations
      where id = truvex.location_members.location_id
        and manager_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from truvex.locations
      where id = truvex.location_members.location_id
        and manager_id = auth.uid()
    )
  );

create policy "location_members: worker read own"
  on truvex.location_members for select
  using (user_id = auth.uid());

create policy "location_members: worker update own mute"
  on truvex.location_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =====================================================================
-- roles
-- Manager: full access to roles for their location.
-- Workers: read roles for locations they're members of.
-- =====================================================================
create policy "roles: manager full access"
  on truvex.roles for all
  using (
    exists (
      select 1 from truvex.locations
      where id = truvex.roles.location_id
        and manager_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from truvex.locations
      where id = truvex.roles.location_id
        and manager_id = auth.uid()
    )
  );

create policy "roles: worker read"
  on truvex.roles for select
  using (
    exists (
      select 1 from truvex.location_members
      where location_id = truvex.roles.location_id
        and user_id = auth.uid()
    )
  );

-- =====================================================================
-- worker_roles
-- Manager: full access.
-- Workers: read their own.
-- =====================================================================
create policy "worker_roles: manager full access"
  on truvex.worker_roles for all
  using (
    exists (
      select 1 from truvex.locations
      where id = truvex.worker_roles.location_id
        and manager_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from truvex.locations
      where id = truvex.worker_roles.location_id
        and manager_id = auth.uid()
    )
  );

create policy "worker_roles: worker read own"
  on truvex.worker_roles for select
  using (user_id = auth.uid());

-- =====================================================================
-- callouts
-- Manager: insert/update callouts for their location.
-- Workers: read callouts for their locations.
-- =====================================================================
create policy "callouts: manager insert"
  on truvex.callouts for insert
  with check (
    exists (
      select 1 from truvex.locations
      where id = truvex.callouts.location_id
        and manager_id = auth.uid()
    )
  );

create policy "callouts: manager update"
  on truvex.callouts for update
  using (
    exists (
      select 1 from truvex.locations
      where id = truvex.callouts.location_id
        and manager_id = auth.uid()
    )
  );

create policy "callouts: manager read"
  on truvex.callouts for select
  using (
    exists (
      select 1 from truvex.locations
      where id = truvex.callouts.location_id
        and manager_id = auth.uid()
    )
  );

create policy "callouts: worker read"
  on truvex.callouts for select
  using (
    exists (
      select 1 from truvex.location_members
      where location_id = truvex.callouts.location_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

create policy "callouts: worker update first_accepted_at"
  on truvex.callouts for update
  using (
    exists (
      select 1 from truvex.location_members
      where location_id = truvex.callouts.location_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

-- =====================================================================
-- callout_responses
-- Workers: insert/update their own responses.
-- Manager: read all responses for their location's callouts.
-- =====================================================================
create policy "callout_responses: worker insert own"
  on truvex.callout_responses for insert
  with check (worker_id = auth.uid());

create policy "callout_responses: worker update own"
  on truvex.callout_responses for update
  using (worker_id = auth.uid())
  with check (worker_id = auth.uid());

create policy "callout_responses: worker read own"
  on truvex.callout_responses for select
  using (worker_id = auth.uid());

create policy "callout_responses: manager read"
  on truvex.callout_responses for select
  using (
    exists (
      select 1 from truvex.callouts c
      join truvex.locations l on l.id = c.location_id
      where c.id = truvex.callout_responses.callout_id
        and l.manager_id = auth.uid()
    )
  );

-- =====================================================================
-- notification_log
-- Service role only — Edge Functions write, no client reads.
-- =====================================================================
create policy "notification_log: service role only"
  on truvex.notification_log for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
