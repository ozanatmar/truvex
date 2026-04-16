import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Owner's phone — receives SMS when a Business customer submits a support ticket
const OWNER_PHONE = '+19999999999'; // Replace with actual owner number in dashboard env

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

    const { location_id, message } = await req.json();
    if (!location_id || !message?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify manager owns this location and fetch details
    const { data: location } = await supabase
      .schema('truvex')
      .from('locations')
      .select('name, subscription_tier, manager_id')
      .eq('id', location_id)
      .single();

    if (!location || location.manager_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tier = location.subscription_tier;

    // Log ticket to DB
    await supabase.schema('truvex').from('support_tickets').insert({
      location_id,
      user_id: user.id,
      message: message.trim(),
      tier,
    });

    // Only send SMS for business tier
    if (tier === 'business') {
      const { data: profile } = await supabase
        .schema('truvex')
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      const smsBody = `[Truvex Support — Business]\nFrom: ${location.name} (${profile?.phone ?? 'unknown'})\n\n${message.trim()}`;

      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
      const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER')!;
      const ownerPhone = Deno.env.get('SUPPORT_OWNER_PHONE') ?? OWNER_PHONE;

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioFrom,
            To: ownerPhone,
            Body: smsBody,
          }),
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
