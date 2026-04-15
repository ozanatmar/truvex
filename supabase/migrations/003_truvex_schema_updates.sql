-- Truvex schema migration 003
-- Documents all schema changes applied since 001/002 that were missing from migration files.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards throughout.

-- =====================================================================
-- locations — subscription lifecycle fields
-- =====================================================================
alter table truvex.locations
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_period_end timestamptz;

-- =====================================================================
-- location_members — pending invite fields
-- Allow user_id to be NULL so we can store invites before the worker
-- has created an account. The unique constraint on (location_id, user_id)
-- must be replaced with a partial index that only applies to real members.
-- =====================================================================

-- Drop the old NOT NULL + unique constraints (may already be altered)
alter table truvex.location_members
  alter column user_id drop not null;

-- Drop old unique constraint if it exists (name from migration 001)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'location_members_location_id_user_id_key'
      and conrelid = 'truvex.location_members'::regclass
  ) then
    alter table truvex.location_members
      drop constraint location_members_location_id_user_id_key;
  end if;
end $$;

-- Partial unique index: only one active row per (location, user) pair
create unique index if not exists location_members_active_unique
  on truvex.location_members(location_id, user_id)
  where user_id is not null;

-- Invite columns
alter table truvex.location_members
  add column if not exists invited_phone text,
  add column if not exists invited_name text,
  add column if not exists primary_role_id uuid references truvex.roles(id) on delete set null,
  add column if not exists additional_role_ids uuid[] not null default '{}';

-- Index for fast invite lookups by phone
create index if not exists location_members_invited_phone_idx
  on truvex.location_members(invited_phone)
  where invited_phone is not null and user_id is null;

-- =====================================================================
-- profiles — phone normalisation trigger (store with + prefix)
-- Replaces the trigger from migration 001 to normalise phone format.
-- =====================================================================
create or replace function truvex.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  raw_phone text;
begin
  raw_phone := coalesce(new.phone, new.raw_user_meta_data->>'phone', '');
  -- Ensure phone is stored with leading + (Supabase Auth omits it)
  if raw_phone <> '' and left(raw_phone, 1) <> '+' then
    raw_phone := '+' || raw_phone;
  end if;
  insert into truvex.profiles (id, phone)
  values (new.id, raw_phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =====================================================================
-- shift_presets — saved shift time templates per location
-- =====================================================================
create table if not exists truvex.shift_presets (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  label text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  unique(location_id, label)
);

alter table truvex.shift_presets enable row level security;

create policy "shift_presets: manager full access"
  on truvex.shift_presets for all
  using (
    exists (
      select 1 from truvex.locations
      where id = truvex.shift_presets.location_id
        and manager_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from truvex.locations
      where id = truvex.shift_presets.location_id
        and manager_id = auth.uid()
    )
  );

-- =====================================================================
-- Additional RLS policies for invite and profile access
-- =====================================================================

-- Workers can claim their own pending invite (update where user_id IS NULL)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'truvex'
      and tablename = 'location_members'
      and policyname = 'location_members: worker claim invite'
  ) then
    execute $policy$
      create policy "location_members: worker claim invite"
        on truvex.location_members for update
        using (invited_phone = (
          select phone from truvex.profiles where id = auth.uid()
        ) and user_id is null)
        with check (user_id = auth.uid())
    $policy$;
  end if;
end $$;

-- Workers can insert their own worker_roles rows (needed when claiming invite)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'truvex'
      and tablename = 'worker_roles'
      and policyname = 'worker_roles: worker insert own'
  ) then
    execute $policy$
      create policy "worker_roles: worker insert own"
        on truvex.worker_roles for insert
        with check (user_id = auth.uid())
    $policy$;
  end if;
end $$;

-- Managers can read profiles of workers in their locations
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'truvex'
      and tablename = 'profiles'
      and policyname = 'profiles: manager read worker profiles'
  ) then
    execute $policy$
      create policy "profiles: manager read worker profiles"
        on truvex.profiles for select
        using (
          exists (
            select 1 from truvex.location_members lm
            join truvex.locations l on l.id = lm.location_id
            where lm.user_id = truvex.profiles.id
              and l.manager_id = auth.uid()
          )
        )
    $policy$;
  end if;
end $$;

-- Managers can update worker profile names
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'truvex'
      and tablename = 'profiles'
      and policyname = 'profiles: manager update worker name'
  ) then
    execute $policy$
      create policy "profiles: manager update worker name"
        on truvex.profiles for update
        using (
          exists (
            select 1 from truvex.location_members lm
            join truvex.locations l on l.id = lm.location_id
            where lm.user_id = truvex.profiles.id
              and l.manager_id = auth.uid()
          )
        )
    $policy$;
  end if;
end $$;
