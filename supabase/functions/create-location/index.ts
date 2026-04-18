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

    // One-time Pro trial per phone account. trial_used_at on the profile is the
    // gate — not the number of locations, not a flag on the location row.
    const { data: profile } = await supabase
      .schema('truvex')
      .from('profiles')
      .select('trial_used_at')
      .eq('id', user.id)
      .single();

    const trialEligible = !profile?.trial_used_at;
    const trialSecondsRaw = Number(Deno.env.get('TRIAL_DURATION_SECONDS') ?? '');
    const trialSeconds = Number.isFinite(trialSecondsRaw) && trialSecondsRaw > 0
      ? trialSecondsRaw
      : DEFAULT_TRIAL_SECONDS;

    const now = new Date();
    const trialEndsAt = trialEligible
      ? new Date(now.getTime() + trialSeconds * 1000).toISOString()
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
      return new Response(JSON.stringify({ error: locationError?.message ?? 'Failed to create location' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Burn the trial for this phone account.
    if (trialEligible) {
      await supabase
        .schema('truvex')
        .from('profiles')
        .update({ trial_used_at: now.toISOString() })
        .eq('id', user.id);
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
