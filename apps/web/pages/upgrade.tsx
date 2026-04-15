import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { supabaseAdmin } from '../lib/supabase';
import { stripe, PLANS } from '../lib/stripe';
import Head from 'next/head';

interface Props {
  locationId: string;
  tier: 'starter' | 'pro';
  locationName: string;
}

export default function UpgradePage({ locationId, tier, locationName }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'checkout'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plan = PLANS[tier];

  async function handleSendOtp() {
    setLoading(true);
    setError('');
    const digits = phone.replace(/\D/g, '');
    const e164 = `+1${digits}`;

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
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError('');
    const digits = phone.replace(/\D/g, '');
    const e164 = `+1${digits}`;

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: e164, token: otp }),
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

  return (
    <>
      <Head>
        <title>Upgrade to {plan.name} — Truvex</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>Truvex</h1>
          <h2 style={styles.title}>Upgrade {locationName} to {plan.name}</h2>
          <p style={styles.price}>{plan.price}</p>

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
              <button style={styles.button} onClick={handleSendOtp} disabled={loading}>
                {loading ? 'Sending…' : 'Send verification code'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <p style={styles.label}>Enter the 6-digit code we texted you</p>
              <input
                style={{ ...styles.input, textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
              {error && <p style={styles.error}>{error}</p>}
              <button style={styles.button} onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : 'Continue to payment'}
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
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: '#2a2a40',
    borderRadius: 16,
    padding: '40px',
    maxWidth: 420,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  logo: { color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 },
  title: { color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 },
  price: { color: '#4f46e5', fontSize: 24, fontWeight: 800, margin: 0 },
  label: { color: '#aaa', fontSize: 14, margin: 0 },
  phoneRow: { display: 'flex', alignItems: 'center', gap: 8 },
  countryCode: { color: '#fff', fontSize: 16, fontWeight: 600 },
  input: {
    flex: 1,
    background: '#1a1a2e',
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#fff',
    fontSize: 16,
    outline: 'none',
    width: '100%',
  },
  button: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
  error: { color: '#ef4444', fontSize: 14, margin: 0 },
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { location_id, tier } = ctx.query;

  if (!location_id || !tier || (tier !== 'starter' && tier !== 'pro')) {
    return { notFound: true };
  }

  const { data: location } = await supabaseAdmin
    .from('truvex.locations')
    .select('name')
    .eq('id', location_id)
    .single();

  if (!location) return { notFound: true };

  return {
    props: {
      locationId: location_id as string,
      tier: tier as 'starter' | 'pro',
      locationName: location.name,
    },
  };
};
