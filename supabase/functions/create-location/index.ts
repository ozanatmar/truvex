import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_ROLES = ['Cook', 'Server', 'Bartender', 'Host', 'Cashier', 'Dishwasher', 'Manager'];
const DEFAULT_TRIAL_SECONDS = 14 * 24 * 60 * 60;

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, industry_type = 'restaurant' } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Location name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Profile must exist before we claim the trial. If handle_new_user hasn't
    // finished on a fresh signup (or the row was wiped), fail loudly instead
    // of silently handing out a trial the stamp won't persist.
    const { data: profile, error: profileErr } = await supabase
      .schema('truvex')
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      return new Response(JSON.stringify({ error: `Profile lookup failed: ${profileErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found — please sign out and sign in again.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atomic one-time Pro trial. UPDATE returns a row iff trial_used_at was
    // still NULL when this statement ran — row count is the source of truth.
    // Do not replace with read-then-write: a 0-row UPDATE is silent there and
    // lets the same phone re-trial on every new location.
    const now = new Date();
    const { data: claimed, error: claimErr } = await supabase
      .schema('truvex')
      .from('profiles')
      .update({ trial_used_at: now.toISOString() })
      .eq('id', user.id)
      .is('trial_used_at', null)
      .select('id');

    if (claimErr) {
      return new Response(JSON.stringify({ error: `Trial claim failed: ${claimErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trialEligible = (claimed?.length ?? 0) > 0;
    const trialEndsAt = trialEligible
      ? new Date(now.getTime() + DEFAULT_TRIAL_SECONDS * 1000).toISOString()
      : null;

    const { data: location, error: locationError } = await supabase
      .schema('truvex')
      .from('locations')
      .insert({
        name: name.trim(),
        industry_type,
        manager_id: user.id,
        subscription_tier: 'free',
        subscription_status: trialEligible ? 'trialing' : 'active',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (locationError || !location) {
      // Release the trial we just claimed so the user can retry. Equality
      // guard ensures we only clear our own stamp, not someone else's.
      if (trialEligible) {
        await supabase
          .schema('truvex')
          .from('profiles')
          .update({ trial_used_at: null })
          .eq('id', user.id)
          .eq('trial_used_at', now.toISOString());
      }
      return new Response(JSON.stringify({ error: locationError?.message ?? 'Failed to create location' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roleRows = DEFAULT_ROLES.map((roleName) => ({
      location_id: location.id,
      name: roleName,
    }));
    await supabase.schema('truvex').from('roles').insert(roleRows);

    return new Response(JSON.stringify({ location }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
