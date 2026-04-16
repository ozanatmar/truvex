import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { supabaseAdmin } from '../../lib/supabase';

interface CalloutData {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  role: { name: string };
  location: { name: string };
}

interface Props {
  callout: CalloutData;
}

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${minuteStr} ${period}`;
}

export default function CalloutPage({ callout }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'details' | 'phone' | 'otp' | 'done'>('details');
  const [intent, setIntent] = useState<'accepted' | 'declined' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shiftDate = new Date(callout.shift_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  function handleRespond(response: 'accepted' | 'declined') {
    setIntent(response);
    setStep('phone');
  }

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
    if (res.ok) setStep('otp');
    else {
      const data = await res.json();
      setError(data.error ?? 'Failed to send code');
    }
  }

  async function handleVerifyAndRespond() {
    setLoading(true);
    setError('');
    const digits = phone.replace(/\D/g, '');
    const e164 = `+1${digits}`;

    const res = await fetch('/api/callout/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: e164,
        token: otp,
        callout_id: callout.id,
        response: intent,
      }),
    });

    setLoading(false);
    if (res.ok) setStep('done');
    else {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong');
    }
  }

  const isClosed = callout.status !== 'open' && callout.status !== 'pending_selection';

  return (
    <>
      <Head>
        <title>{callout.role.name} shift — {callout.location.name}</title>
      </Head>
      <div style={s.container}>
        <div style={s.card}>
          <p style={s.locationName}>{callout.location.name}</p>
          <h1 style={s.roleName}>{callout.role.name}</h1>
          <p style={s.date}>{shiftDate}</p>
          <p style={s.time}>{formatTime(callout.start_time)} – {formatTime(callout.end_time)}</p>
          {callout.notes && <p style={s.notes}>{callout.notes}</p>}

          {step === 'details' && (
            <>
              {isClosed ? (
                <div style={s.closedBanner}>
                  <p style={s.closedText}>This shift is no longer available.</p>
                </div>
              ) : (
                <div style={s.actions}>
                  <button style={s.acceptBtn} onClick={() => handleRespond('accepted')}>
                    Accept Shift
                  </button>
                  <button style={s.declineBtn} onClick={() => handleRespond('declined')}>
                    Decline
                  </button>
                </div>
              )}
            </>
          )}

          {step === 'phone' && (
            <>
              <p style={s.label}>Enter your phone number to {intent === 'accepted' ? 'accept' : 'decline'}</p>
              <div style={s.phoneRow}>
                <span style={s.cc}>+1</span>
                <input
                  style={s.input}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              {error && <p style={s.error}>{error}</p>}
              <button style={s.acceptBtn} onClick={handleSendOtp} disabled={loading || phone.replace(/\D/g, '').length !== 10}>
                {loading ? 'Sending…' : 'Send verification code'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <p style={s.label}>Enter the 6-digit code we texted you</p>
              <input
                style={{ ...s.input, textAlign: 'center', fontSize: 24, letterSpacing: 8, width: '100%' }}
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
              {error && <p style={s.error}>{error}</p>}
              <button style={s.acceptBtn} onClick={handleVerifyAndRespond} disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : `Confirm ${intent}`}
              </button>
            </>
          )}

          {step === 'done' && (
            <div style={{ ...s.closedBanner, background: intent === 'accepted' ? '#10b98122' : '#6b728022' }}>
              <p style={{ ...s.closedText, color: intent === 'accepted' ? '#10b981' : '#aaa' }}>
                {intent === 'accepted'
                  ? "You've accepted! The manager will confirm shortly."
                  : "You've declined this shift."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: '#2a2a40', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  locationName: { color: '#666', fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 1 },
  roleName: { color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 },
  date: { color: '#aaa', fontSize: 15, margin: 0 },
  time: { color: '#ccc', fontSize: 18, fontWeight: 700, margin: 0 },
  notes: { color: '#666', fontSize: 14, fontStyle: 'italic', margin: 0 },
  actions: { display: 'flex', gap: 10, marginTop: 8 },
  acceptBtn: { flex: 1, background: '#F5853F', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  declineBtn: { flex: 1, background: '#2a2a40', color: '#aaa', border: '1px solid #444', borderRadius: 10, padding: '14px', fontSize: 16, cursor: 'pointer' },
  closedBanner: { background: '#6b728022', borderRadius: 10, padding: 16, marginTop: 8 },
  closedText: { color: '#aaa', fontSize: 14, margin: 0, textAlign: 'center' },
  label: { color: '#aaa', fontSize: 14, margin: 0 },
  phoneRow: { display: 'flex', alignItems: 'center', gap: 8 },
  cc: { color: '#fff', fontSize: 16, fontWeight: 600 },
  input: { flex: 1, background: '#1a1a2e', border: 'none', borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 16, outline: 'none' },
  error: { color: '#ef4444', fontSize: 13, margin: 0 },
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { id } = ctx.params!;

  const { data } = await supabaseAdmin
    .from('truvex.callouts')
    .select('*, role:truvex.roles(name), location:truvex.locations(name)')
    .eq('id', id)
    .single();

  if (!data) return { notFound: true };

  return { props: { callout: data } };
};
