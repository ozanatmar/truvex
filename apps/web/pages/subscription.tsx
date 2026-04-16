import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

interface Props {
  locationId: string;
  mode: 'manage' | 'cancel';
}

export default function SubscriptionPage({ locationId, mode }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'done'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelled, setCancelled] = useState(false);

  const title = mode === 'cancel' ? 'Cancel subscription' : 'Manage subscription';
  const ctaLabel = mode === 'cancel' ? 'Confirm cancellation' : 'Go to billing portal';

  async function handleSendOtp() {
    setLoading(true);
    setError('');
    const e164 = `+1${phone.replace(/\D/g, '')}`;

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

  async function handleVerify() {
    setLoading(true);
    setError('');
    const e164 = `+1${phone.replace(/\D/g, '')}`;

    if (mode === 'manage') {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, token: otp, location_id: locationId }),
      });

      if (res.ok) {
        const { portalUrl } = await res.json();
        window.location.href = portalUrl;
      } else {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
        setLoading(false);
      }
    } else {
      // Cancel mode
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, token: otp, location_id: locationId }),
      });

      setLoading(false);
      if (res.ok) {
        setCancelled(true);
        setStep('done');
        // Redirect to app after short delay
        setTimeout(() => {
          window.location.href = 'truvex://subscription-updated';
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
      }
    }
  }

  return (
    <>
      <Head>
        <title>{title} — Truvex</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>Truvex</h1>
          <h2 style={styles.title}>{title}</h2>

          {step === 'done' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ ...styles.label, color: '#10b981', fontSize: 16 }}>
                {cancelled
                  ? "Subscription cancelled. You'll keep access until your billing period ends."
                  : 'Done!'}
              </p>
              <p style={styles.label}>You can close this tab and return to the app.</p>
            </div>
          ) : step === 'phone' ? (
            <>
              <p style={styles.label}>Enter your manager phone number to continue</p>
              {mode === 'cancel' && (
                <p style={{ ...styles.label, color: '#f59e0b' }}>
                  Your subscription will be cancelled at the end of your current billing period.
                  You'll keep full access until then.
                </p>
              )}
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
              <button style={styles.button} onClick={handleSendOtp} disabled={loading || phone.replace(/\D/g, '').length < 10}>
                {loading ? 'Sending…' : 'Send verification code'}
              </button>
            </>
          ) : (
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
              <button
                style={mode === 'cancel' ? { ...styles.button, background: '#ef4444' } : styles.button}
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Please wait…' : ctaLabel}
              </button>
              <button style={styles.ghostButton} onClick={() => setStep('phone')}>
                Back
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
  label: { color: '#aaa', fontSize: 14, margin: 0, lineHeight: '1.5' },
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
    background: '#F5853F',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
  ghostButton: {
    background: 'transparent',
    color: '#666',
    border: 'none',
    padding: '8px',
    fontSize: 14,
    cursor: 'pointer',
    width: '100%',
  },
  error: { color: '#ef4444', fontSize: 14, margin: 0 },
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { location_id } = ctx.query;
  const mode = 'manage';

  if (!location_id) return { notFound: true };

  return {
    props: {
      locationId: location_id as string,
      mode,
    },
  };
};
