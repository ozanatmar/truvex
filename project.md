# Truvex — Project Reference

Last updated: 2026-04-18

---

## Design Tokens

Design tokens are defined in `apps/mobile/lib/theme.ts` (exported as `C` for colors, `F` for fonts). All new screens must use these constants. Full documentation is in `CLAUDE.md → Design System`.

| Role | Token | Value |
|---|---|---|
| Brand / active state | `C.primary` | `#0E7C7B` |
| Primary CTA (Post, Accept, Add) | `C.cta` | `#F5853F` |
| Secondary accent / warning | `C.coral` | `#E8634A` |
| Card background | `C.bgCard` | `#1a1a2e` |
| Screen background | `C.bgDark` | `#0f0f1a` |
| Secondary text | `C.textSub` | `#7A8899` |
| Title font | `F.extraBold` | `DMSans_800ExtraBold` |
| Button font | `F.bold` | `DMSans_700Bold` |
| Card radius | — | `18` |

---

## Architecture Summary

Truvex is a React Native (Expo) mobile app for restaurant shift callout management.

- **Mobile:** Expo Router (file-based navigation), Zustand for state, Supabase for data + auth + realtime
- **Web:** Minimal Next.js app — Stripe checkout, success redirect, and shareable callout page only
- **Backend:** Supabase (PostgreSQL + Realtime + Auth + Edge Functions)
- **Auth:** Phone number + SMS OTP via Supabase Auth (which uses Twilio under the hood)
- **Notifications:** Expo Push on paid tiers; Twilio SMS fallback after 2 min for unopened push; free tier gets no push/SMS
- **Billing:** Web-only Stripe checkout, app opens browser, deep link `truvex://upgrade-success` returns user to app

---

## Environment Variables

### Mobile (`apps/mobile/.env`)
| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `EXPO_PUBLIC_WEB_URL` | Web app base URL — used to build upgrade/subscription URLs opened in browser (fallback: `https://truvex.app`) |
| `EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL` | (Derived from `EXPO_PUBLIC_SUPABASE_URL/functions/v1`) Used by support screen to call `notify-support` Edge Function |

### Web (`apps/web/.env.local`)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key |
| `STRIPE_SECRET_KEY` | Stripe server-side key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client-side key |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for $49/mo Pro plan (monthly) |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe price ID for $39/mo Pro plan (billed $468/yr) |
| `STRIPE_BUSINESS_PRICE_ID` | Stripe price ID for $99/mo Business plan (monthly) |
| `STRIPE_BUSINESS_ANNUAL_PRICE_ID` | Stripe price ID for $79/mo Business plan (billed $948/yr) |
| `NEXT_PUBLIC_APP_URL` | Web app base URL (e.g. `https://truvex.app`) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID — also used by `/api/auth/check-phone` + `/api/auth/send-otp` for Twilio Lookup (VoIP filter) |
| `AUTH_TEST_PHONES` | Comma-separated E.164 numbers that bypass the Twilio Lookup VoIP filter. Must match the test phones configured in Supabase Auth dashboard (they aren't real lines so Lookup rejects them). |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sending number |
| `IS_LAUNCHED` | Launch gate. `"true"` serves the live marketing site; anything else (unset/empty/`"false"`) redirects all marketing surfaces to `/pre-launch`. |
| `WAITLIST_IP_SALT` | Server-side salt used to sha256-hash visitor IPs on the `/api/waitlist` endpoint. Required in production. |

### Supabase Edge Functions (set via dashboard Secrets)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set by Supabase |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sending number |
| `EXPO_ACCESS_TOKEN` | Expo push notification access token |
| `SUPPORT_OWNER_PHONE` | Owner's phone number to receive support SMS (notify-support function) |
| `STRIPE_SECRET_KEY` | Used by `delete-location` to cancel active Stripe subscriptions when a restaurant is deleted |

---

## Database Schema

All tables live in the `truvex` schema. See `supabase/migrations/001_truvex_schema.sql` for full DDL.

| Table | Purpose |
|---|---|
| `truvex.profiles` | User profiles (linked to `auth.users`). Includes `expo_push_token` and `trial_used_at` (one-time Pro trial gate — once set, future locations for this phone are Free/active with no trial). |
| `truvex.locations` | Restaurants/businesses. Tracks `subscription_tier`, Stripe IDs. |
| `truvex.location_members` | User ↔ location link. `member_type` = manager/worker, `status` = pending/active, `is_muted`. |
| `truvex.roles` | Roles per location (Cook, Server, etc.). Configurable. |
| `truvex.worker_roles` | Worker ↔ role assignments. One primary + optional additional. |
| `truvex.callouts` | Posted shift callouts. Tracks timing for auto-assign and escalation. |
| `truvex.callout_responses` | Worker accepted/declined responses per callout. |
| `truvex.notification_log` | Log of every push/SMS sent. Used for 2-min SMS fallback. |
| `truvex.support_tickets` | In-app support messages submitted by Business-tier managers. |
| `truvex.waitlist_signups` | Email signups captured from the pre-launch landing page. |
| `truvex.blog_posts` | Blog posts created via `/api/blog/generate`. `hero_image_url` points at a public image in the `truvex` storage bucket at `blog/{slug}.png`. |

**Schema note:** During development these tables share Namedrop's Supabase project. At launch, export `truvex` schema → import as `public` in a new Supabase project + update env vars only.

---

## External Services

| Service | Purpose | Where configured |
|---|---|---|
| Supabase | Database, Auth (OTP), Realtime, Edge Functions | Dashboard |
| Twilio | OTP SMS delivery + notification SMS fallback | Supabase Auth settings + Edge Function secrets |
| Expo Push | Mobile push notifications | `expo-notifications` SDK + Expo dashboard |
| Stripe | Subscription billing (web-only) | Web app env vars + Stripe dashboard |
| Vercel | Web app hosting | Vercel dashboard |

---

## Authentication Flow

1. User enters US phone → `supabase.auth.signInWithOtp({ phone })` → Twilio sends 6-digit SMS
2. User enters OTP → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
3. On success, trigger creates `truvex.profiles` row if new
4. App checks `truvex.locations.manager_id = user.id` → manager
5. If not manager, calls `truvex.claim_pending_invites()` RPC — attaches any pending-invite `location_members` rows (where `invited_phone` matches and `user_id IS NULL`) to this user and promotes the stored primary/additional roles into `worker_roles`. The RPC is `SECURITY DEFINER` because workers can't SELECT or UPDATE pending-invite rows under RLS (`user_id = auth.uid()` hides them).
6. Checks `truvex.location_members` with `member_type = 'worker'` and `status = 'active'` → worker
7. Neither → `/no-location` (or onboarding if they tap "Set up my restaurant")

---

## Notification Flow

1. Manager posts callout → Supabase Edge Function `send-notification` triggered
2. Function checks `subscription_tier`:
   - `free`: skip all notifications
   - `starter` / `pro`: continue
3. Queries eligible workers (matching role, not muted, active)
4. Sends Expo push to workers with `expo_push_token`
5. Workers without push token get Twilio SMS immediately
6. After 2 min: `auto-assign` function sends Twilio SMS to workers whose push wasn't opened (`opened_at IS NULL`)
7. All sends logged to `truvex.notification_log`

**auto-assign function also handles:**
- 5-min nudge to manager after first acceptance (`selection_needed`)
- 15-min no-response escalation to manager (`no_response_escalation`)
- 30-min auto-assignment to earliest acceptor

---

## Billing Flow

### Trial model
- Trial is **one-time per phone account**, gated by `truvex.profiles.trial_used_at`.
- The first location created by a phone starts as `subscription_tier='free'`, `subscription_status='trialing'`, with `trial_ends_at = now() + 14 days`.
- During the trial the tier stays `free` but `hasProFeatures()` returns true — push + SMS are enabled, worker limit lifts to Pro (30).
- Additional locations on the same phone: always `free`/`active`, no trial.
- `expire-trials` Edge Function runs every minute via `pg_cron` — flips `trialing` locations past `trial_ends_at` with no `stripe_subscription_id` to `subscription_status='expired'`. Tier stays `free`.

### Checkout (first-time subscription — no existing `stripe_subscription_id`)
1. Manager taps Upgrade → app opens browser to `https://truvex.app/upgrade?location_id=...&tier=...&phone=...`
2. Web page prefills phone and auto-sends OTP (same Supabase account)
3. On verify: creates Stripe Checkout session → redirects to Stripe. Pro checkouts carry the remaining trial via `subscription_data.trial_end` (≥48h left; Stripe minimum). Business checkouts never carry a trial — they bill immediately.
4. On payment: Stripe webhook hits `/api/webhooks/stripe` → updates `locations.subscription_tier` + status + `stripe_subscription_id`.
5. Stripe success_url → `/success` → redirects to `truvex://upgrade-success`
6. App deep link handler re-fetches location data

### Mid-subscription plan change (Pro → Business)
When the location already has a `stripe_subscription_id`, the app calls `POST /api/subscription/change-plan` instead of opening checkout. Routing through checkout would create a **second** Stripe subscription on the same customer and double-bill.
- Server derives cadence (monthly/annual) from the current price so Pro annual → Business annual.
- Swaps the single price item on the existing sub with `proration_behavior='create_prorations'`. Stripe credits the unused portion of Pro against the new Business rate.
- If the sub is currently `trialing`, sets `trial_end='now'` and `payment_behavior='error_if_incomplete'` so the upgrade bills immediately — prevents a free 14-day Business run. Otherwise keeps `billing_cycle_anchor='unchanged'` to preserve the renewal date.
- App shows a confirmation dialog listing what Business adds and whether the trial will end before firing the API call.

### Cancel and reactivate
- **Cancel** (`POST /api/subscription/cancel`): sets `cancel_at_period_end=true` on the Stripe sub and writes `subscription_status='cancelled'` to the DB. The tier stays on the paid plan until `subscription_period_end`.
- **Reactivate** is only available via the Stripe Customer Portal (no native button). The portal flips `cancel_at_period_end=false`. The `customer.subscription.updated` webhook mirrors this back to the DB as `subscription_status='active'` (or `'trialing'`).
- Terminal expiry is handled by `customer.subscription.deleted` — flips tier to `free`, status to `expired`, and clears Stripe IDs.

### Stripe webhook events (`/api/webhooks/stripe`)
| Event | DB effect |
|---|---|
| `checkout.session.completed` | Sets tier, status (`trialing` or `active`), `stripe_subscription_id`, `subscription_period_end`. Clears `trial_ends_at` when the sub is not trialing. |
| `customer.subscription.updated` | Mirrors status from `sub.cancel_at_period_end` (`cancelled`) or `sub.status` (`active` / `trialing` / `past_due`). Updates tier when a new price is on a live sub. |
| `customer.subscription.deleted` | Tier → `free`, status → `expired`, clears `stripe_subscription_id` and `subscription_period_end`. |
| `invoice.payment_succeeded` | Status → `active`, refreshes `subscription_period_end`, clears `trial_ends_at` (first paid invoice ends the trial). Skips when `billing_reason='subscription_create'` (handled by `checkout.session.completed`). |
| `invoice.payment_failed` | Status → `past_due`. |
| `customer.subscription.trial_will_end` | No-op (mobile app shows its own countdown). |

### Plan-change flow matrix
| # | From → To | Path | Notes |
|---|---|---|---|
| 1 | Free trial → Pro trial → Business | Checkout for Pro (trial carries via `trial_end`), then change-plan to Business | Ending trial on Business upgrade bills immediately |
| 2 | Free trial → Business | Checkout for Business | No trial carry — Business checkouts bill on completion |
| 3 | Pro trial → Free | Cancel subscription | Access continues to `subscription_period_end`, then `expired` |
| 4 | Business → Pro | Not exposed in UI (intentional — avoids downgrade churn) | — |
| 5 | Pro → Business | change-plan with proration | Preserves cadence (monthly/annual) |
| 6 | Business → Free | Cancel subscription | Same as flow 3 |
| 7 | Pro → Free | Cancel subscription | Same as flow 3 |

**Worker count on downgrade:** existing workers are never auto-removed. The per-tier cap (`workerLimit()` in `apps/mobile/lib/subscription.ts` — free: 10, pro: 30, business: unlimited) only blocks **new** adds in `/(manager)/team/add`. Managers above the cap keep their current team and can remove workers manually to get under it.

### Deleting a restaurant
- Manager → Settings → "Delete this restaurant" (destructive confirm) → calls `delete-location` Edge Function.
- Function cancels any active Stripe subscription immediately, then deletes the location. FK cascades wipe roles, worker_roles, location_members, callouts, callout_responses, notification_log, shift_presets, and support_tickets.
- `profiles` and `auth.users` are never touched. A deleted location does not delete any manager or worker account.

### Abuse prevention
- `/api/auth/check-phone` and `/api/auth/send-otp` call Twilio Lookup v2 `line_type_intelligence` for phones with no existing profile. VoIP / non-fixed VoIP / voicemail / pager numbers are rejected before an OTP is sent. Returning users skip the Lookup to avoid the per-call charge.

---

## Screens

### Manager
| Route | Screen |
|---|---|
| `/(auth)/` | Phone entry |
| `/(auth)/verify` | OTP input |
| `/onboarding/restaurant` | Restaurant name (first launch) |
| `/onboarding/roles` | Role setup (first launch) |
| `/onboarding/first-worker` | Add first worker (first launch) |
| `/(manager)/` | Home — active callouts + subscription banner |
| `/(manager)/post-callout` | Post callout form with shift presets |
| `/(manager)/callout/[id]` | Callout detail + acceptor selection |
| `/(manager)/team` | Worker list |
| `/(manager)/team/add` | Add worker (direct link or pending invite) |
| `/(manager)/team/[id]` | Edit worker name + roles |
| `/(manager)/history` | Past callouts |
| `/(manager)/analytics` | Callout stats + worker response table (Business tier only) |
| `/(manager)/support` | In-app support (Free: gate; Pro: email link; Business: form) |
| `/(manager)/settings` | Subscription management + account + tutorial |

### Worker
| Route | Screen |
|---|---|
| `/(worker)/` | Open shifts |
| `/(worker)/history` | Accepted shift history |
| `/(worker)/settings` | Mute toggle + leave location + tutorial |
| `/no-location` | Not linked to any location |

### Loading / Splash
Shown during app bootstrap (session check → profile → location lookup). Implemented in `components/LoadingScreen.tsx`.
- Full-screen background photo (`assets/loading-bg.jpg`) with `ResizeMode.COVER`
- Dark navy overlay at 40% opacity (`rgba(10,18,38,0.4)`)
- App icon (`assets/icon.png`) + "Truvex" wordmark centered in upper third
- Thin white 2px progress bar at the bottom, animates with bootstrap step progress
- Fades out (500ms opacity transition) once bootstrap completes, revealing the routed screen beneath

### Web
| Route | Page |
|---|---|
| `/upgrade` | Stripe checkout entry (OTP auth → Stripe Checkout) |
| `/success` | Post-payment deep link redirect to `truvex://upgrade-success` |
| `/callout/[id]` | Shareable callout for free tier (OTP auth → accept/decline) |
| `/subscription` | Stripe Customer Portal redirect (OTP auth → portal) |
| `/subscription/cancel` | Cancel subscription (OTP auth → cancel at period end) |
| `/subscription/return` | Post-portal landing → deep link to `truvex://subscription-updated` |
| `/api/subscription/change-plan` | Mid-subscription price swap with proration (called from native app, not browser) |
| `/pre-launch` | Pre-launch holding page with waitlist email capture. Shown when `IS_LAUNCHED` is not `"true"`; served via middleware redirect. `noindex`. |
| `/coming-soon` | Emergency maintenance page. Shown when `MAINTENANCE_MODE=true`; takes precedence over the launch gate. `noindex`. |
