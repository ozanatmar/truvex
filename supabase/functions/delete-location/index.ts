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
      return json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

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

    // Cancel any active Stripe subscription. Immediate cancel — manager is
    // deleting the location, they've accepted the loss of remaining period.
    if (location.stripe_subscription_id) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        try {
          const res = await fetch(
            `https://api.stripe.com/v1/subscriptions/${location.stripe_subscription_id}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${stripeKey}` },
            },
          );
          if (!res.ok) {
            const body = await res.text();
            console.error('Stripe cancel failed:', res.status, body);
          }
        } catch (err) {
          console.error('Stripe cancel threw:', err);
        }
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
