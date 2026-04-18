import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase';
import { lookupPhone, isBlockedLineType } from '../../../lib/twilioLookup';

// Gatekeeper for new signups: blocks virtual/VoIP numbers from minting fresh
// Pro trials. Returning users (profile already exists) skip the Twilio Lookup
// to avoid the per-call charge on login.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body ?? {};
  if (!phone || typeof phone !== 'string' || !phone.startsWith('+')) {
    return res.status(400).json({ error: 'E.164 phone required' });
  }

  const { data: existing } = await supabaseAdmin
    .schema('truvex')
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) return res.status(200).json({ ok: true, existing: true });

  const lookup = await lookupPhone(phone);

  if (lookup && lookup.valid === false) {
    return res.status(400).json({ error: 'That phone number looks invalid. Double-check and try again.' });
  }

  if (lookup && isBlockedLineType(lookup.type)) {
    return res.status(400).json({
      error: 'Truvex only supports real mobile numbers. Virtual or VoIP numbers aren\'t allowed.',
    });
  }

  return res.status(200).json({ ok: true, existing: false });
}
