import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { lookupPhone, isBlockedLineType } from '../../../lib/twilioLookup';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  // VoIP/virtual-number gate for first-time phones only — returning users skip
  // the Lookup to avoid the charge on every login.
  const { data: existing } = await supabaseAdmin
    .schema('truvex')
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (!existing) {
    const lookup = await lookupPhone(phone);
    if (lookup && lookup.valid === false) {
      return res.status(400).json({ error: 'That phone number looks invalid. Double-check and try again.' });
    }
    if (lookup && isBlockedLineType(lookup.type)) {
      return res.status(400).json({
        error: 'Truvex only supports real mobile numbers. Virtual or VoIP numbers aren\'t allowed.',
      });
    }
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return res.status(400).json({ error: error.message });

  res.status(200).json({ ok: true });
}
