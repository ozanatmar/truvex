# Truvex — CLAUDE.md

This file is the single source of truth for building Truvex. Read it fully before writing any code.

---

## Git Branch Rules

**Always work on `dev`. Never push directly to `main`.**

- All commits go to the `dev` branch
- `main` is only updated when the user explicitly says to merge (e.g. "merge to main" or "release")
- When merging to main: fast-forward merge `dev` → `main`, then push both branches
- Never use `--force` on either branch

---

## project.md Maintenance Rules

**Update `project.md` BEFORE completing any task that involves:**
- Adding a new environment variable → update the Environment Variables section
- Adding or modifying a Supabase table or column → update the Database Schema section
- Adding a new external service or API integration → update the Services section
- Changing the authentication flow → update the Auth Flow section
- Adding a new screen or major navigation change → update the Screens section
- Changing the notification logic → update the Notification Flow section
- Changing the subscription/billing flow → update the Billing Flow section

**Do NOT update `project.md` for:** adding components, bug fixes, styling changes, renaming variables, adding utility functions, or any change that doesn't alter architecture, schema, or external dependencies.

`project.md` documents what would confuse a new developer — not every file that exists.

---

## Notion Page Maintenance Rules

**Update the Notion product page (https://www.notion.so/ozanatmar/Truvex-3428996bf05881f583a7ca3e58ca0aa7) AFTER completing any task that involves a structural change:**
- New or changed screen → update the relevant section (Screens Reference, Build Status, Decisions Log)
- New or changed core flow (auth, callout, notification, billing) → update the relevant flow section
- New or changed monetization logic → update the Monetization section
- New Stripe webhook event → update the Stripe Webhook Events section
- Any decision that changes how the product works at a user-facing level → update the Decisions Log

**The same threshold as `project.md`** — bug fixes, styling, and internal refactors do NOT require a Notion update. Only changes that would affect how a new developer or stakeholder understands the product.

---

## Product Overview

**Truvex** is a mobile app for restaurants that replaces the last-minute callout scramble. When a worker calls in sick, the manager taps one button. The system identifies all workers with a matching role, sends push notifications (+ SMS fallback), and workers accept with one tap. Multiple workers can accept; the manager selects who covers. The callout closes after selection or auto-assigns the first acceptor after 30 minutes if the manager doesn't act.

- **Domain:** truvex.app
- **Deep link scheme:** `truvex://`
- **Platform:** iOS + Android (Expo)
- **Market:** US only, English only (v1)
- **Vertical:** Restaurants (MVP). Backend is multi-vertical ready from day one.
- **Users:** Managers and Workers only (v1)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native with Expo (managed workflow) |
| Language | TypeScript |
| Navigation | Expo Router (file-based routing) |
| Backend | Supabase (PostgreSQL + Realtime + Auth) |
| Auth | Supabase Auth — phone number + SMS OTP |
| Push notifications | Expo Push Notifications |
| SMS | Twilio (OTP auth + notification fallback) |
| Billing | Stripe (web only — no in-app purchase) |
| Web layer | Next.js (minimal — Stripe checkout + deep link redirect only) |
| Hosting | Vercel (web layer) |
| State management | Zustand |
| Forms | React Hook Form + Zod |

**Why no in-app purchase:** Apple and Google take 15–30% of subscription revenue on IAP. Billing happens on the web via Stripe. The app opens a browser for checkout; after payment, the web page redirects to `truvex://upgrade-success` which reopens the app. This is fully App Store compliant.

---

## Project Structure

```
truvex/
├── apps/
│   ├── mobile/                  # React Native Expo app
│   │   ├── app/                 # Expo Router screens
│   │   │   ├── (auth)/          # Unauthenticated screens
│   │   │   │   ├── index.tsx    # Phone number entry
│   │   │   │   └── verify.tsx   # OTP verification
│   │   │   ├── (manager)/       # Manager screens (tab layout)
│   │   │   │   ├── index.tsx    # Home — active callouts
│   │   │   │   ├── team.tsx     # Team list
│   │   │   │   └── history.tsx  # Callout history
│   │   │   ├── (worker)/        # Worker screens (tab layout)
│   │   │   │   ├── index.tsx    # Home — open shifts
│   │   │   │   └── history.tsx  # Accepted shifts history
│   │   │   ├── onboarding/      # Manager first-launch flow
│   │   │   │   ├── restaurant.tsx  # Enter restaurant name
│   │   │   │   ├── roles.tsx    # Configure roles
│   │   │   │   └── first-worker.tsx # Add first worker
│   │   │   └── no-location.tsx  # Worker with no location linked
│   │   ├── components/          # Shared UI components
│   │   ├── lib/
│   │   │   ├── supabase.ts      # Supabase client
│   │   │   ├── notifications.ts # Expo push + Twilio SMS logic
│   │   │   └── store.ts         # Zustand global state
│   │   ├── hooks/               # Custom React hooks
│   │   └── types/               # Shared TypeScript types
│   └── web/                     # Next.js web app (minimal)
│       ├── pages/
│       │   ├── upgrade.tsx      # Stripe checkout entry
│       │   ├── success.tsx      # Post-payment redirect to truvex://
│       │   └── callout/[id].tsx # Shareable callout link (free tier)
│       └── lib/
│           └── stripe.ts
├── supabase/
│   ├── migrations/              # SQL migration files
│   └── functions/               # Supabase Edge Functions
│       ├── send-notification/   # Push + SMS dispatch
│       └── auto-assign/         # 30-min auto-assign cron
└── CLAUDE.md                    # This file
```

---

## Database Schema

All tables live in the `truvex` schema during development (inside Namedrop's Supabase project). At launch, they move to the `public` schema of a dedicated Supabase project. See Database Strategy section below.

Row Level Security (RLS) is enabled on all tables.

### `truvex.profiles`
Managed by Supabase Auth. Extended with a public profile.
```sql
create table truvex.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  name text,
  expo_push_token text,
  created_at timestamptz default now()
);
```

### `truvex.locations`
One row per restaurant/business location.
```sql
create table truvex.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry_type text not null default 'restaurant', -- multi-vertical ready
  manager_id uuid not null references truvex.profiles(id),
  subscription_tier text not null default 'free', -- 'free' | 'starter' | 'pro'
  subscription_status text not null default 'trialing',
  -- 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
  trial_ends_at timestamptz,
  subscription_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);
```
**Subscription tiers:**
- `free` — up to 10 workers, no push/SMS
- `starter` — up to 30 workers, push + SMS ($49/month)
- `pro` — unlimited workers, push + SMS ($99/month)

**Subscription statuses:**
- `trialing` — within the 14-day free trial
- `active` — paid and current
- `past_due` — payment failed, grace period
- `cancelled` — cancelled by manager, access continues until `subscription_period_end`
- `expired` — trial ended or subscription fully lapsed, no notifications

### `truvex.location_members`
Links users to locations. A worker can be in multiple locations.
`user_id` is nullable — a NULL row represents a pending invite (worker not yet signed up).
```sql
create table truvex.location_members (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  user_id uuid references truvex.profiles(id) on delete cascade, -- NULL for pending invites
  member_type text not null, -- 'manager' | 'worker'
  status text not null default 'pending', -- 'pending' | 'active'
  is_muted boolean not null default false,
  invited_by uuid references truvex.profiles(id),
  invited_phone text,        -- phone number of the invited worker (pending invite only)
  invited_name text,         -- display name set by manager (takes precedence over profile name)
  primary_role_id uuid references truvex.roles(id) on delete set null,
  additional_role_ids uuid[] not null default '{}',
  created_at timestamptz default now()
  -- unique(location_id, user_id) where user_id is not null (enforced via partial index)
);
```

### `truvex.roles`
Configurable roles per location. Pre-populated with restaurant defaults on location creation.
```sql
create table truvex.roles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(location_id, name)
);
```
**Default roles inserted on location creation:** Cook, Server, Bartender, Host, Cashier, Dishwasher, Manager

### `truvex.worker_roles`
Many-to-many between workers and roles. One primary role + optional additional roles.
```sql
create table truvex.worker_roles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  user_id uuid not null references truvex.profiles(id) on delete cascade,
  role_id uuid not null references truvex.roles(id) on delete cascade,
  is_primary boolean not null default false,
  unique(location_id, user_id, role_id)
);
```

### `truvex.callouts`
One row per posted callout.
```sql
create table truvex.callouts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  manager_id uuid not null references truvex.profiles(id),
  role_id uuid not null references truvex.roles(id),
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  status text not null default 'open',
  -- 'open' | 'pending_selection' | 'filled' | 'cancelled' | 'expired'
  open_to_all_roles boolean not null default false,
  first_accepted_at timestamptz, -- triggers 5-min selection timer
  auto_assign_at timestamptz,    -- set to first_accepted_at + 30min
  assigned_worker_id uuid references truvex.profiles(id),
  assigned_at timestamptz,
  assigned_by text, -- 'manager' | 'auto'
  created_at timestamptz default now()
);
```

### `truvex.callout_responses`
Worker responses to callouts.
```sql
create table truvex.callout_responses (
  id uuid primary key default gen_random_uuid(),
  callout_id uuid not null references truvex.callouts(id) on delete cascade,
  worker_id uuid not null references truvex.profiles(id),
  response text not null, -- 'accepted' | 'declined'
  responded_at timestamptz default now(),
  unique(callout_id, worker_id)
);
```

### `truvex.notification_log`
Tracks every push and SMS sent. Used for SMS fallback logic (2-min window).
```sql
create table truvex.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references truvex.profiles(id),
  callout_id uuid references truvex.callouts(id),
  channel text not null, -- 'push' | 'sms'
  type text not null,
  -- 'callout_posted' | 'selection_needed' | 'selected' | 'not_selected'
  -- | 'shift_filled' | 'shift_cancelled' | 'no_response_escalation'
  sent_at timestamptz default now(),
  opened_at timestamptz -- set when push notification is opened
);
```

### `truvex.shift_presets`
Saved shift time templates per location. Manager can save and reuse common shift times in the post-callout form.
```sql
create table truvex.shift_presets (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  label text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  unique(location_id, label)
);
```

---

## Authentication Flow

1. User enters phone number on the auth screen
2. App calls `supabase.auth.signInWithOtp({ phone })` → Supabase triggers Twilio to send a 6-digit SMS OTP
3. User enters OTP → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
4. On success, Supabase creates/returns a session. A profile row is created in `public.profiles` via database trigger if it doesn't exist
5. App checks `location_members` for the authenticated user:
   - If manager member found → route to `/(manager)/`
   - If worker member found → route to `/(worker)/`
   - If no members found → route to `/no-location` (workers) or onboarding (first-time managers)
6. The app detects whether the user is a manager by checking `locations.manager_id = user.id`

**Key rule:** One account per phone number. A worker can belong to multiple locations under the same account.

---

## Core Flows

### Manager Posts a Callout
1. Manager taps "Post Callout" on home screen
2. Form: date (default today), start time, end time, role (select from location roles), notes (optional)
3. On submit → insert row into `callouts` with status `open`
4. Edge Function `send-notification` is triggered:
   - Queries all `location_members` for this location with matching role in `worker_roles` (primary OR additional)
   - Filters out muted workers (`is_muted = true`)
   - On free tier: skip push/SMS entirely (workers check app manually)
   - On paid tier: send Expo push notification to all eligible workers
   - Log each notification in `notification_log`
   - After 2 minutes: for any worker who hasn't opened the push (opened_at is null), send Twilio SMS fallback
5. Supabase Realtime subscription on the manager's home screen updates the callout card live

### Worker Accepts a Callout
1. Worker opens app OR receives push/SMS notification
2. Worker sees the callout card on home screen with Accept / Decline buttons
3. Worker taps Accept → insert row into `callout_responses` with response `accepted`
4. If this is the first acceptance on this callout:
   - Update `callouts.first_accepted_at = now()`
   - Update `callouts.auto_assign_at = now() + interval '30 minutes'`
   - Update `callouts.status = 'pending_selection'`
   - Schedule auto-assign Edge Function to run at `auto_assign_at`
5. After 5 minutes from `first_accepted_at` → notify manager: "X workers accepted, please select who will cover"
6. Worker's callout card shows: "You've accepted — waiting for manager to confirm"

### Manager Selects Who Covers
1. Manager receives notification that workers accepted
2. Manager opens the callout, sees list of acceptors with names and primary roles
3. Manager taps a worker to select them
4. Update `callouts.assigned_worker_id`, `assigned_at`, `assigned_by = 'manager'`, `status = 'filled'`
5. Notify selected worker: "You're confirmed for the [Role] shift on [date] at [time]"
6. Notify all other acceptors: "This shift has been filled by someone else"
7. Callout card on all workers' screens disappears

### Auto-Assignment (30-minute fallback)
- Supabase Edge Function or pg_cron job runs at `callouts.auto_assign_at`
- Checks if `callouts.status` is still `pending_selection` (not already filled/cancelled)
- If so: assigns the first acceptor (earliest `responded_at` in `callout_responses`)
- Updates `assigned_by = 'auto'`, triggers same notifications as manual selection

### No-Response Escalation (15 minutes)
- If `callouts.status = 'open'` and `first_accepted_at IS NULL` 15 minutes after creation
- Notify manager: "No one has accepted yet"
- Manager can tap "Open to all roles" → sets `callouts.open_to_all_roles = true`
- Re-queries all location workers regardless of role and sends new notifications

### Callout Cancellation
- Manager taps Cancel on an active callout
- Update `callouts.status = 'cancelled'`
- If a worker had already accepted (`callout_responses` has an `accepted` row):
  - Notify that worker: "The shift has been cancelled by the manager"
  - Notify manager if the worker had an active accepted shift
- Notify all other notified workers that the shift is cancelled

### Worker Fired / Removed
- Manager deletes worker from team list
- Delete `location_members` row for that user + location
- Delete `worker_roles` rows for that user + location
- Worker immediately loses access to location's callouts
- If worker had an active `accepted` response on an open callout → notify manager
- Worker's other location memberships are unaffected

---

## Notification Messages

| Trigger | Recipient | Message |
|---|---|---|
| Callout posted | All matching workers | "New shift available: [Role] on [date] [time–time]. Open Truvex to accept." |
| First acceptance (5 min later) | Manager | "[N] workers accepted the [Role] shift. Please select who will cover." |
| No response (15 min) | Manager | "No one has accepted the [Role] shift yet." |
| Manager selects worker | Selected worker | "You're confirmed for the [Role] shift on [date] at [start time]." |
| Manager selects worker | Other acceptors | "This shift has been filled by someone else." |
| Callout cancelled | Accepted worker | "The [Role] shift on [date] has been cancelled by the manager." |
| Auto-assigned | Assigned worker | "You've been automatically assigned the [Role] shift on [date] at [start time]." |
| Shift filled (any path) | All notified workers | "The [Role] shift on [date] has been filled." |

---

## Billing Flow

**The app never touches payment directly. No in-app purchase.**

1. Manager taps "Upgrade" inside the native app
2. App opens browser: `https://truvex.app/upgrade?location_id=[id]&tier=[starter|pro]`
3. Web page authenticates the manager via phone OTP (same Supabase session)
4. Stripe Checkout session created server-side with `success_url = https://truvex.app/success?session_id={CHECKOUT_SESSION_ID}`
5. Manager completes payment on Stripe
6. Stripe webhook → `/api/webhooks/stripe` → updates `locations.subscription_tier`, stores `stripe_customer_id` and `stripe_subscription_id`
7. Success page redirects to `truvex://upgrade-success`
8. App receives deep link, re-fetches location data, unlocks paid features

---

## Shareable Callout Link (Free Tier)

On the free tier, push/SMS notifications are disabled. To notify workers, manager can copy a shareable link.

- Link format: `https://truvex.app/callout/[callout_id]`
- Web page shows callout details (role, date, time, notes, restaurant name)
- Worker can tap "Accept" or "Decline" from the browser
- If not logged in, prompted to enter phone + OTP before responding
- Response is written to `callout_responses` table same as in-app

---

## Screens Reference

### Manager Screens
| Screen | Route | Description |
|---|---|---|
| Home | `/(manager)/` | Active callouts with response status + Post Callout button + recent activity |
| Post Callout | `/(manager)/post-callout` | Form: date, time, role, notes |
| Callout Detail | `/(manager)/callout/[id]` | Full callout with acceptor list and select button |
| Team | `/(manager)/team` | List of workers with roles and status (active/pending/muted) |
| Add Worker | `/(manager)/team/add` | Manual entry or contact picker |
| Edit Worker | `/(manager)/team/[id]` | Edit name, phone, roles |
| History | `/(manager)/history` | Past callouts log |
| Onboarding 1 | `/onboarding/restaurant` | Enter restaurant name (first launch only) |
| Onboarding 2 | `/onboarding/roles` | Configure roles (first launch only) |
| Onboarding 3 | `/onboarding/first-worker` | Add first worker (first launch only) |

### Worker Screens
| Screen | Route | Description |
|---|---|---|
| Home | `/(worker)/` | Open shifts the worker is eligible for, separated by location |
| History | `/(worker)/history` | List of past accepted shifts |
| Settings | `/(worker)/settings` | Mute toggle only |

### Shared Screens
| Screen | Route | Description |
|---|---|---|
| Phone Entry | `/(auth)/` | Phone number input |
| OTP Verify | `/(auth)/verify` | 6-digit OTP input |
| No Location | `/no-location` | Shown when authenticated but not linked to any location |

---

## Environment Variables

### Mobile app (`apps/mobile/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Web app (`apps/web/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only, never expose to client
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_STARTER_PRICE_ID=          # Stripe price ID for $49/mo Starter plan
STRIPE_PRO_PRICE_ID=               # Stripe price ID for $99/mo Pro plan
NEXT_PUBLIC_APP_URL=               # e.g. https://truvex.app
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### Supabase Edge Functions (set via Supabase dashboard secrets)
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
EXPO_ACCESS_TOKEN=                # For sending push notifications via Expo
```

---

## Key Decisions (Do Not Change Without Discussion)

- **No in-app purchase.** Billing is web-only via Stripe + deep link redirect. This is intentional to avoid 15–30% App Store/Play Store fees.
- **Supabase Realtime for callout state.** Do not poll. Use `supabase.channel().on('postgres_changes', ...)` so callout status updates instantly on all connected devices.
- **Free tier has no push/SMS.** Workers must open the app. The shareable link is the free-tier notification method.
- **First acceptor is NOT automatically assigned.** Multiple workers can accept. The manager selects. First acceptor only gets auto-assigned if manager ignores for 30 minutes.
- **No editing callouts.** Once posted, a callout cannot be edited. Manager must cancel and repost.
- **Roles are flat.** No hierarchy. "Cook" covers all cooking roles. No sub-roles.
- **One phone = one account.** A worker can belong to multiple locations under the same phone number.
- **Worker deleted from location does NOT delete their account.** Only unlinks them from that location.
- **industry_type field on locations.** Always set it. Never hardcode "restaurant" logic in queries. This keeps the backend multi-vertical.
- **OTP is via Supabase Auth (which uses Twilio).** Same Twilio account handles OTP + notification SMS.

---

## Supabase RLS Policies (Summary)

- `profiles`: User can read/write their own row only
- `locations`: Manager can read/update their own location. Workers can read locations they're members of.
- `location_members`: Manager can read/write members of their location. Workers can read their own memberships.
- `roles`: Manager can read/write roles for their location. Workers can read roles for their locations.
- `worker_roles`: Manager can read/write worker roles for their location. Workers can read their own.
- `callouts`: Manager can insert/update callouts for their location. Workers can read callouts for their locations.
- `callout_responses`: Workers can insert/update their own responses. Manager can read all responses for their location's callouts.
- `notification_log`: Service role only (Edge Functions write, no client reads).

---

## Supabase Edge Functions

### `send-notification`
Triggered on `callouts` INSERT (status = 'open').
- Finds all eligible workers (matching role, not muted, active status)
- On paid tier: sends Expo push notifications
- After 2 minutes: sends Twilio SMS to workers whose push wasn't opened
- Logs everything to `notification_log`

### `auto-assign`
Runs as a scheduled job (pg_cron) every minute.
- Finds callouts where `status = 'pending_selection'` AND `auto_assign_at <= now()`
- For each: assigns the earliest acceptor, updates status to `filled`, sends notifications
- Also handles the 15-minute no-response escalation (notifies manager)
- Also handles the 5-minute "please select" nudge after first acceptance

---

## Database Strategy

### Development
During development, Truvex tables live inside **Namedrop's existing Supabase project** to avoid the need for a second Supabase project (free tier allows only 2 active projects).

To avoid any collision with Namedrop's tables (which live in the `public` schema), all Truvex tables use a dedicated `truvex` schema:

```sql
create schema if not exists truvex;
```

Every table in this file is prefixed accordingly in migrations:
```sql
create table truvex.profiles ( ... );
create table truvex.locations ( ... );
-- etc.
```

RLS policies, triggers, and Edge Functions all reference `truvex.*` tables explicitly.

### Launch
When launching, create a new dedicated Supabase project for Truvex. Migration is:
1. Export the `truvex` schema from Namedrop's database
2. Import into the new Truvex Supabase project as the `public` schema
3. Update `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to point to the new project
4. No code changes required — only environment variables change

This is why all queries must use the schema-qualified table names during development, and the migration path is clean.

## Running Locally

```bash
# Install dependencies
npm install

# Start Expo dev server
cd apps/mobile && npx expo start

# Start web app
cd apps/web && npm run dev

# Run migrations against Namedrop's Supabase project (dev)
npx supabase db push --db-url [NAMEDROP_DB_URL]
```

---

## What Is NOT Built in v1 (Backlog)

- Shift calendar / worker availability scheduling
- Overtime warnings
- CSV import for worker onboarding
- Integration with 7shifts, Deputy, Homebase, When I Work
- Owner role / multi-location management
- Pay rate on callouts
- Worker accept/decline history stats for managers
- Manager account settings (change restaurant name, phone)
- Configurable escalation timeout (hardcoded at 15 min for no-response, 30 min for auto-assign)
- Multi-language support
- Non-US markets
