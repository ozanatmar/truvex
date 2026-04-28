# SMS Test Task List

**Real number under test:** +19046633990 (Fanytel — bypassed via AUTH_TEST_PHONES)
**Test manager/worker account:** +15550000001 (OTP: 123456)

---

## Prerequisites
- Web app running locally: `cd apps/web && npm run dev`
- Metro running: `cd apps/mobile && npx expo start`
- Mobile `.env` pointing to local web server (192.168.100.5:3000)
- Dev APK installed on Android device, connected to Metro

---

## Scenario A — +19046633990 as **Worker**
*(Manager = test account +15550000001)*

- [ ] **A0 — Invite SMS (Row 0)** — *do before signing in*
  Sign in as manager (+15550000001). Go to Team → Add worker → enter +19046633990 by phone.
  **Expected SMS:** "You've been invited to join [Location] on Truvex. Sign in with this number to start accepting shifts."

- [ ] **A1 — Sign in with real number**
  Open app on device. Enter +19046633990. Enter OTP from Supabase (or real SMS). Accept pending invite.

- [ ] **A2 — Callout posted SMS (Row 1)**
  Manager posts a callout for the worker's role.
  **Expected SMS:** "New shift: [Role] on [date] [start]–[end]. Open Truvex to accept."

- [ ] **A3 — Selected by manager SMS (Row 4a)**
  Worker accepts the callout (in-app). Manager opens callout detail → selects the worker.
  **Expected SMS:** "You're confirmed for the [Role] shift on [date] at [start]."

- [ ] **A4 — Auto-assigned SMS (Row 4b)**
  Manager posts a new callout. Worker accepts. Manager ignores for 30 minutes (auto-assign fires).
  **Expected SMS:** "You've been auto-assigned the [Role] shift on [date] at [start]."

- [ ] **A5 — Shift reminder SMS (Row 9)**
  Get assigned to a shift with start time ~65 minutes from now. Wait for the cron to fire.
  **Expected SMS:** "Reminder: your [Role] shift at [Location] starts in 1 hour."

---

## Scenario B — +19046633990 as **Manager**
*(Worker = test account +15550000001 — SMS to them is skipped, they can still accept in-app)*

- [ ] **B1 — First acceptance SMS (Row 2)**
  Sign in with +19046633990 as manager (create a location if needed). Post a callout. Test worker accepts in-app.
  **Expected SMS:** "[Worker] accepted the [Role] shift on [date] at [start]. Tap to confirm who covers."

- [ ] **B2 — No response escalation SMS (Row 3)**
  Post a callout for a role no test worker has. Wait 15 minutes without any acceptance.
  **Expected SMS:** "No one has accepted the [Role] shift on [date] at [start] yet. You may want to reach out or post again."

- [ ] **B3 — Removed accepted worker SMS (Row 7)**
  Post a callout. Test worker accepts. Go to Team → remove the test worker.
  **Expected SMS:** "[Worker] was removed but had accepted the [Role] shift on [date] at [start]. Don't forget to post a new callout."

---

## Notes
- SMS to +15550000... numbers is silently skipped (guarded in send-notification and auto-assign).
- Push tokens are not set up in dev (no Apple dev account yet), so every push also triggers immediate SMS — this is intentional for dev.
- `opened_at` is never set in dev, so the 2-min SMS fallback in auto-assign will always fire for every push log.
- After testing, revert `apps/mobile/.env` `EXPO_PUBLIC_WEB_URL` back to the Vercel URL.
