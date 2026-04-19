import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error('getUser error:', authError.message);
      return json({ error: `Auth failed: ${authError.message}` }, 401);
    }
    if (!user) return json({ error: 'No user for token' }, 401);

    const { location_id } = await req.json();
    if (!location_id || typeof location_id !== 'string') {
      return json({ error: 'location_id is required' }, 400);
    }

    const { data: location, error: locErr } = await supabase
      .schema('truvex')
      .from('locations')
      .select('id, manager_id, stripe_subscription_id')
      .eq('id', location_id)
      .single();

    if (locErr || !location) return json({ error: 'Location not found' }, 404);
    if (location.manager_id !== user.id) return json({ error: 'Forbidden' }, 403);

    // Cancel any active Stripe subscription before deleting the row.
    // Immediate cancel — manager is deleting the location, they've accepted
    // the loss of remaining period. If Stripe cancellation fails we MUST
    // abort the DB delete, otherwise the customer keeps getting charged with
    // no way for us to correlate the subscription back to a location.
    if (location.stripe_subscription_id) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) {
        console.error('STRIPE_SECRET_KEY is not set — cannot cancel', location.stripe_subscription_id);
        return json({ error: 'Server misconfigured: Stripe key missing' }, 500);
      }
      try {
        const res = await fetch(
          `https://api.stripe.com/v1/subscriptions/${location.stripe_subscription_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${stripeKey}` },
          },
        );
        // 404 means the subscription no longer exists in Stripe (already
        // cancelled/deleted elsewhere) — safe to proceed with DB delete.
        if (!res.ok && res.status !== 404) {
          const body = await res.text();
          console.error('Stripe cancel failed:', res.status, body);
          return json({ error: `Stripe cancel failed (${res.status}): ${body}` }, 502);
        }
      } catch (err) {
        console.error('Stripe cancel threw:', err);
        return json({ error: `Stripe cancel threw: ${String(err)}` }, 502);
      }
    }

    // Cascade handles roles, worker_roles, location_members, callouts,
    // callout_responses, notification_log, shift_presets, support_tickets.
    // profiles and auth.users are NOT touched.
    const { error: delErr } = await supabase
      .schema('truvex')
      .from('locations')
      .delete()
      .eq('id', location_id);

    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
