import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, token, callout_id, response } = req.body;

  if (!phone || !token || !callout_id || !response) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (response !== 'accepted' && response !== 'declined') {
    return res.status(400).json({ error: 'Invalid response' });
  }

  // Verify OTP
  const { data: authData, error: authError } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (authError || !authData.user) {
    return res.status(400).json({ error: authError?.message ?? 'Invalid code' });
  }

  const userId = authData.user.id;

  // Verify callout exists and is still open
  const { data: callout } = await supabaseAdmin
    .from('truvex.callouts')
    .select('id, status, location_id, first_accepted_at')
    .eq('id', callout_id)
    .single();

  if (!callout) return res.status(404).json({ error: 'Callout not found' });
  if (callout.status !== 'open' && callout.status !== 'pending_selection') {
    return res.status(400).json({ error: 'This shift is no longer accepting responses' });
  }

  // Verify user is an active member of the location
  const { data: membership } = await supabaseAdmin
    .from('truvex.location_members')
    .select('id')
    .eq('location_id', callout.location_id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this location' });
  }

  // Insert/update response
  const { error: responseError } = await supabaseAdmin
    .from('truvex.callout_responses')
    .upsert({
      callout_id,
      worker_id: userId,
      response,
      responded_at: new Date().toISOString(),
    });

  if (responseError) {
    return res.status(500).json({ error: responseError.message });
  }

  // If first acceptance, update callout timing
  if (response === 'accepted' && !callout.first_accepted_at) {
    const now = new Date();
    await supabaseAdmin
      .from('truvex.callouts')
      .update({
        first_accepted_at: now.toISOString(),
        auto_assign_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        status: 'pending_selection',
      })
      .eq('id', callout_id)
      .is('first_accepted_at', null);
  }

  res.status(200).json({ ok: true });
}
