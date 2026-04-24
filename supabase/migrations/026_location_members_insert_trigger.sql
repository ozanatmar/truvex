-- Fire send-notification on location_members INSERT so the worker_invited
-- handler (row 0) can SMS the invited phone number when a manager adds a
-- worker by phone number (pending invite: user_id IS NULL).
create trigger on_member_insert
after insert on truvex.location_members
for each row execute function supabase_functions.http_request(
  'https://qiaawqoubyxotelxtnhq.supabase.co/functions/v1/send-notification',
  'POST',
  '{"Content-type":"application/json"}',
  '{}',
  '5000'
);
