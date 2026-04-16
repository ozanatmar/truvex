-- Support tickets table for in-app support requests (Business tier: full form; Pro tier: email link)

CREATE TABLE IF NOT EXISTS truvex.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references truvex.locations(id) on delete cascade,
  user_id     uuid not null references truvex.profiles(id),
  message     text not null,
  tier        text not null,
  created_at  timestamptz default now()
);

ALTER TABLE truvex.support_tickets ENABLE ROW LEVEL SECURITY;

-- Manager can create tickets for their own location
CREATE POLICY "manager_insert_support_tickets"
  ON truvex.support_tickets FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM truvex.locations l
      WHERE l.id = location_id AND l.manager_id = auth.uid()
    )
  );

-- Manager can read their own tickets
CREATE POLICY "manager_read_own_support_tickets"
  ON truvex.support_tickets FOR SELECT
  USING (user_id = auth.uid());
