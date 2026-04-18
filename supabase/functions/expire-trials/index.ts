import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Flip trialing locations whose trial has ended without a Stripe subscription
// over to status='expired'. Tier stays 'free' — trial was a feature grant on top
// of the free tier, not a tier itself.
serve(async () => {
  try {
    const nowIso = new Date().toISOString();

    const { data: expired, error } = await supabase
      .schema('truvex')
      .from('locations')
      .update({ subscription_status: 'expired' })
      .eq('subscription_status', 'trialing')
      .lte('trial_ends_at', nowIso)
      .is('stripe_subscription_id', null)
      .select('id');

    if (error) {
      console.error('expire-trials failed:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ expired_count: expired?.length ?? 0 }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('expire-trials error:', err);
    return new Response(String(err), { status: 500 });
  }
});
