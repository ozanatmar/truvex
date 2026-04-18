-- Workers need to be able to delete their own location_members and
-- worker_roles rows so the "Leave location" button on worker settings
-- actually removes them. Previously only the manager full-access policy
-- granted DELETE, so worker deletes silently no-op'd under RLS and the
-- worker was re-routed back to the location on next sign-in.

create policy "location_members: worker delete own"
  on truvex.location_members for delete
  using (user_id = auth.uid());

create policy "worker_roles: worker delete own"
  on truvex.worker_roles for delete
  using (user_id = auth.uid());
