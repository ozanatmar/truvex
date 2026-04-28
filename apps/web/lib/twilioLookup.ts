// Twilio Lookup v2 — line_type_intelligence. Used to block virtual/VoIP
// numbers from creating new Truvex accounts (each new phone = one free Pro
// trial, so a throwaway VoIP number is the cheapest abuse vector).

export type PhoneLineType =
  | 'landline'
  | 'mobile'
  | 'fixedVoip'
  | 'nonFixedVoip'
  | 'personal'
  | 'tollFree'
  | 'premium'
  | 'sharedCost'
  | 'uan'
  | 'voicemail'
  | 'pager'
  | null;

export interface PhoneLookupResult {
  valid: boolean;
  type: PhoneLineType;
  carrier: string | null;
}

// Fail-open on lookup errors (network, rate limit, Twilio 5xx). We don't want
// an outage at Twilio to block every signup — abuse surfaces are rare and we
// can tighten later if needed.
export async function lookupPhone(e164: string): Promise<PhoneLookupResult | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return {
      valid: !!data.valid,
      type: (data.line_type_intelligence?.type ?? null) as PhoneLineType,
      carrier: data.line_type_intelligence?.carrier_name ?? null,
    };
  } catch {
    return null;
  }
}

export function isBlockedLineType(t: PhoneLineType): boolean {
  if (!t) return false;
  return t === 'nonFixedVoip' || t === 'fixedVoip' || t === 'voicemail' || t === 'pager';
}

// Supabase Auth's configured test phones bypass Twilio entirely (the OTP is
// fixed in the dashboard). Twilio Lookup would reject them since they're not
// real lines, so we exempt them from the VoIP gate. AUTH_TEST_PHONES is a
// comma-separated list of E.164 numbers.
export function isTestPhone(e164: string): boolean {
  // Supabase test number range — not real assignable exchanges
  if (e164.startsWith('+155500000')) return true;
  const raw = process.env.AUTH_TEST_PHONES;
  if (!raw) return false;
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .includes(e164);
}
