-- Waitlist signups captured from the pre-launch landing page.
-- Writes happen only via the service-role API route. No anon access.

CREATE TABLE IF NOT EXISTS truvex.waitlist_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text,
  user_agent  text,
  ip_hash     text,
  created_at  timestamptz default now()
);

-- Case-insensitive uniqueness on email. Duplicate inserts are swallowed
-- silently by the API to avoid email-enumeration leaks.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_lower_idx
  ON truvex.waitlist_signups (lower(email));

ALTER TABLE truvex.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. anon and authenticated roles must have no access.
-- The waitlist API route uses the service-role client, which bypasses RLS.
