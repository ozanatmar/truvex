import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_ROLES = ['Cook', 'Server', 'Bartender', 'Host', 'Cashier', 'Dishwasher', 'Manager'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the caller is authenticated
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

    // Create the location
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: location, error: locationError } = await supabase
      .schema('truvex')
      .from('locations')
      .insert({
        name: name.trim(),
        industry_type,
        manager_id: user.id,
        subscription_tier: 'free',
        subscription_status: 'trialing',
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

    // Insert default roles
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
