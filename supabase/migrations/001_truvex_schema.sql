-- Truvex schema migration 001
-- All tables live in the truvex schema during development
-- (inside Namedrop's Supabase project, to avoid public schema collision)

create schema if not exists truvex;

-- =====================================================================
-- profiles
-- Extended user profile. Linked to auth.users via trigger.
-- =====================================================================
create table truvex.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  name text,
  expo_push_token text,
  created_at timestamptz default now()
);

-- Auto-create profile row on new auth user
create or replace function truvex.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into truvex.profiles (id, phone)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function truvex.handle_new_user();

-- =====================================================================
-- locations
-- One row per restaurant/business location.
-- =====================================================================
create table truvex.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry_type text not null default 'restaurant',
  manager_id uuid not null references truvex.profiles(id),
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'starter', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

-- =====================================================================
-- location_members
-- Links users (managers and workers) to locations.
-- =====================================================================
create table truvex.location_members (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  user_id uuid not null references truvex.profiles(id) on delete cascade,
  member_type text not null check (member_type in ('manager', 'worker')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  is_muted boolean not null default false,
  invited_by uuid references truvex.profiles(id),
  created_at timestamptz default now(),
  unique(location_id, user_id)
);

-- =====================================================================
-- roles
-- Configurable roles per location.
-- =====================================================================
create table truvex.roles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(location_id, name)
);

-- =====================================================================
-- worker_roles
-- Many-to-many: workers ↔ roles. One primary + optional additional.
-- =====================================================================
create table truvex.worker_roles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  user_id uuid not null references truvex.profiles(id) on delete cascade,
  role_id uuid not null references truvex.roles(id) on delete cascade,
  is_primary boolean not null default false,
  unique(location_id, user_id, role_id)
);

-- =====================================================================
-- callouts
-- One row per posted callout.
-- =====================================================================
create table truvex.callouts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  manager_id uuid not null references truvex.profiles(id),
  role_id uuid not null references truvex.roles(id),
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  status text not null default 'open'
    check (status in ('open', 'pending_selection', 'filled', 'cancelled', 'expired')),
  open_to_all_roles boolean not null default false,
  first_accepted_at timestamptz,
  auto_assign_at timestamptz,
  assigned_worker_id uuid references truvex.profiles(id),
  assigned_at timestamptz,
  assigned_by text check (assigned_by in ('manager', 'auto')),
  created_at timestamptz default now()
);

-- Index for auto-assign cron job
create index idx_callouts_auto_assign
  on truvex.callouts(auto_assign_at)
  where status = 'pending_selection';

-- Index for no-response escalation
create index idx_callouts_no_response
  on truvex.callouts(created_at)
  where status = 'open' and first_accepted_at is null;

-- =====================================================================
-- callout_responses
-- Worker responses (accepted | declined).
-- =====================================================================
create table truvex.callout_responses (
  id uuid primary key default gen_random_uuid(),
  callout_id uuid not null references truvex.callouts(id) on delete cascade,
  worker_id uuid not null references truvex.profiles(id),
  response text not null check (response in ('accepted', 'declined')),
  responded_at timestamptz default now(),
  unique(callout_id, worker_id)
);

-- =====================================================================
-- notification_log
-- Every push and SMS sent. Used for 2-min SMS fallback logic.
-- =====================================================================
create table truvex.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references truvex.profiles(id),
  callout_id uuid references truvex.callouts(id),
  channel text not null check (channel in ('push', 'sms')),
  type text not null check (type in (
    'callout_posted',
    'selection_needed',
    'selected',
    'not_selected',
    'shift_filled',
    'shift_cancelled',
    'no_response_escalation'
  )),
  sent_at timestamptz default now(),
  opened_at timestamptz
);

-- Index for SMS fallback lookup
create index idx_notification_log_callout_user
  on truvex.notification_log(callout_id, user_id)
  where channel = 'push' and opened_at is null;
