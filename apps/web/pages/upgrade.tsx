import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { supabaseAdmin } from '../lib/supabase';
import Head from 'next/head';

type Tier = 'pro' | 'business';
type Billing = 'monthly' | 'annual';

interface Props {
  locationId: string;
  tier: Tier;
  initialBilling: Billing;
  locationName: string;
  prefillPhone: string;
}

const PLAN_INFO = {
  pro: {
    name: 'Pro',
    monthly: '$49/mo',
    annual: '$39/mo',
    annualNote: 'billed $468/yr',
    features: ['Up to 30 workers', 'Push + SMS notifications', '14-day free trial'],
  },
  business: {
    name: 'Business',
    monthly: '$99/mo',
    annual: '$79/mo',
    annualNote: 'billed $948/yr',
    features: ['Unlimited workers', 'Push + SMS notifications', 'Analytics dashboard', '14-day free trial'],
  },
};

function toE164(phone: string): string {
  // If already E.164 (e.g. +12125551234 from store), use as-is
  if (phone.startsWith('+')) return phone;
  return `+1${phone.replace(/\D/g, '')}`;
}

function formatDisplayPhone(phone: string): string {
  const e164 = toE164(phone);
  if (e164.startsWith('+1') && e164.length === 12) {
    const digits = e164.slice(2);
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return e164;
}

export default function UpgradePage({ locationId, tier, initialBilling, locationName, prefillPhone }: Props) {
  const [phone, setPhone] = useState(prefillPhone);
  const [otp, setOtp] = useState('');
  // If phone was prefilled from app, skip straight to OTP step
  const [step, setStep] = useState<'phone' | 'otp'>(prefillPhone ? 'otp' : 'phone');
  const [billing, setBilling] = useState<Billing>(initialBilling);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plan = PLAN_INFO[tier];
  const displayPrice = billing === 'annual' ? plan.annual : plan.monthly;

  async function handleSendOtp() {
    setLoading(true);
    setError('');
    const e164 = toE164(phone);

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: e164 }),
    });

    setLoading(false);
    if (res.ok) {
      setStep('otp');
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to send code');
      setStep('phone'); // fall back so they can re-enter
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError('');
    const e164 = toE164(phone);

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: e164, token: otp, location_id: locationId, tier, billing }),
    });

    if (res.ok) {
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } else {
      const data = await res.json();
      setError(data.error ?? 'Invalid code');
    }
    setLoading(false);
  }

  // When phone was prefilled from the app, fire OTP automatically on mount
  useEffect(() => {
    if (prefillPhone) {
      handleSendOtp();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head>
        <title>Upgrade to {plan.name} — Truvex</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>Truvex</h1>
          <h2 style={styles.title}>Upgrade {locationName} to {plan.name}</h2>

          {/* Billing toggle */}
          <div style={styles.toggleRow}>
            <button
              style={{ ...styles.toggleBtn, ...(billing === 'monthly' ? styles.toggleActive : {}) }}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              style={{ ...styles.toggleBtn, ...(billing === 'annual' ? styles.toggleActive : {}) }}
              onClick={() => setBilling('annual')}
            >
              Annual
              <span style={styles.savePill}>Save 20%</span>
            </button>
          </div>

          <div style={styles.priceBlock}>
            <span style={styles.price}>{displayPrice}</span>
            {billing === 'annual' && (
              <span style={styles.annualNote}>{plan.annualNote}</span>
            )}
          </div>

          <ul style={styles.features}>
            {plan.features.map((f) => (
              <li key={f} style={styles.feature}>
                <span style={styles.checkIcon}>✓</span> {f}
              </li>
            ))}
          </ul>

          <hr style={styles.divider} />

          {step === 'phone' && (
            <>
              <p style={styles.label}>Enter your manager phone number to continue</p>
              <div style={styles.phoneRow}>
                <span style={styles.countryCode}>+1</span>
                <input
                  style={styles.input}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              {error && <p style={styles.error}>{error}</p>}
              <button
                style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
                onClick={handleSendOtp}
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send verification code'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <p style={styles.label}>
                Enter the 6-digit code sent to{' '}
                <strong style={{ color: '#fff' }}>{formatDisplayPhone(phone)}</strong>
              </p>
              {loading && !otp && (
                <p style={{ ...styles.label, color: '#7A8899' }}>Sending code…</p>
              )}
              <input
                style={{ ...styles.input, textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
              {error && <p style={styles.error}>{error}</p>}
              <button
                style={{
                  ...styles.button,
                  ...((loading || otp.length !== 6) ? styles.buttonDisabled : {}),
                }}
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading && otp.length === 6 ? 'Verifying…' : 'Continue to payment'}
              </button>
              <button
                style={styles.backBtn}
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              >
                ← Use a different number
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0f0f1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: '#1a1a2e',
    borderRadius: 18,
    padding: '40px',
    maxWidth: 440,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    border: '1px solid #2a2a40',
  },
  logo: { color: '#0E7C7B', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 },
  title: { color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 },
  toggleRow: {
    display: 'flex',
    background: '#0f0f1a',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#7A8899',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toggleActive: {
    background: '#2a2a40',
    color: '#fff',
  },
  savePill: {
    background: '#F5853F22',
    color: '#F5853F',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 20,
  },
  priceBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
  },
  price: { color: '#F5853F', fontSize: 32, fontWeight: 800 },
  annualNote: { color: '#7A8899', fontSize: 13 },
  features: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  feature: { color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 },
  checkIcon: { color: '#0E7C7B', fontWeight: 700, fontSize: 14 },
  divider: { border: 'none', borderTop: '1px solid #2a2a40', margin: '4px 0' },
  label: { color: '#aaa', fontSize: 14, margin: 0 },
  phoneRow: { display: 'flex', alignItems: 'center', gap: 8 },
  countryCode: { color: '#fff', fontSize: 16, fontWeight: 600 },
  input: {
    flex: 1,
    background: '#2a2a40',
    border: 'none',
    borderRadius: 10,
    padding: '13px 16px',
    color: '#fff',
    fontSize: 16,
    outline: 'none',
    width: '100%',
  },
  button: {
    background: '#F5853F',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#7A8899',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'center' as const,
    padding: '4px 0',
  },
  error: { color: '#ef4444', fontSize: 14, margin: 0 },
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { location_id, tier, billing, phone } = ctx.query;

  if (!location_id || !tier || (tier !== 'pro' && tier !== 'business')) {
    return { notFound: true };
  }

  const { data: location } = await supabaseAdmin
    .schema('truvex')
    .from('locations')
    .select('name')
    .eq('id', location_id)
    .single();

  if (!location) return { notFound: true };

  return {
    props: {
      locationId: location_id as string,
      tier: tier as Tier,
      initialBilling: billing === 'annual' ? 'annual' : 'monthly',
      locationName: location.name,
      prefillPhone: typeof phone === 'string' ? phone : '',
    },
  };
};
