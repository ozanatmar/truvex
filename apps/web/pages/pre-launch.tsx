import { useState, FormEvent } from 'react';
import Head from 'next/head';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function PreLaunch() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed) || trimmed.length > 254) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'pre_launch_hero' }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setErrorMsg('Too many attempts. Please try again in a few minutes.');
        } else {
          setErrorMsg('Something went wrong. Please try again.');
        }
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  return (
    <>
      <Head>
        <title>Truvex (coming soon)</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Truvex is a shift coverage app for restaurants. Launching soon."
        />
      </Head>

      <style>{GLOBAL_CSS}</style>

      <div style={styles.page}>
        <main style={styles.card}>
          <p style={styles.eyebrow}>Shift Coverage App for Restaurants</p>
          <h1 style={styles.heading}>Stop Scrambling When Someone Calls In Sick</h1>
          <p style={styles.body}>
            One tap notifies every qualified worker. Multiple workers accept.
            You pick who covers. Launching soon for restaurants in the US.
          </p>

          {status === 'success' ? (
            <div style={styles.successBox} role="status" aria-live="polite">
              You're on the list. We'll email you the day Truvex opens.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={styles.form} className="waitlist-form" noValidate>
              <label htmlFor="waitlist-email" style={styles.srOnly}>
                Email address
              </label>
              <input
                id="waitlist-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') {
                    setStatus('idle');
                    setErrorMsg('');
                  }
                }}
                disabled={status === 'submitting'}
                style={styles.input}
                aria-invalid={status === 'error'}
                aria-describedby={status === 'error' ? 'waitlist-error' : undefined}
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                style={{
                  ...styles.button,
                  opacity: status === 'submitting' ? 0.7 : 1,
                  cursor: status === 'submitting' ? 'default' : 'pointer',
                }}
              >
                {status === 'submitting' ? 'Adding...' : 'Notify me at launch'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p id="waitlist-error" style={styles.errorLine} role="alert">
              {errorMsg}
            </p>
          )}

          {status !== 'success' && (
            <p style={styles.legal}>
              We'll only email you about launch. No spam, no sharing.
            </p>
          )}
        </main>

        <footer style={styles.footer}>
          <p style={styles.wordmark}>Truvex</p>
          <p style={styles.copyright}>(c) 2026 Truvex. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}

const GLOBAL_CSS = `
  html, body { margin: 0; padding: 0; background: #0f0f1a; }
  *, *::before, *::after { box-sizing: border-box; }
  #__next { min-height: 100vh; }
  .waitlist-form { flex-direction: row; }
  @media (max-width: 560px) {
    .waitlist-form { flex-direction: column !important; }
    .waitlist-form input, .waitlist-form button { width: 100% !important; }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0f0f1a',
    color: '#ffffff',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  card: {
    width: '100%',
    maxWidth: 640,
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#0E7C7B',
    fontWeight: 700,
    margin: '0 0 20px',
  },
  heading: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 'clamp(36px, 6vw, 48px)',
    fontWeight: 800,
    lineHeight: 1.1,
    color: '#ffffff',
    margin: '0 0 20px',
    letterSpacing: '-0.02em',
  },
  body: {
    fontSize: 17,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 32px',
  },
  form: {
    display: 'flex',
    gap: 10,
    margin: '0 auto 14px',
    maxWidth: 520,
    width: '100%',
  } as React.CSSProperties,
  input: {
    flex: 1,
    minWidth: 0,
    background: '#1a1a2e',
    color: '#ffffff',
    border: '1px solid #2a2a40',
    borderRadius: 12,
    padding: '14px 16px',
    fontSize: 16,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
  },
  button: {
    background: '#E8634A',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 22px',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    minHeight: 48,
    whiteSpace: 'nowrap',
  },
  successBox: {
    background: '#1a1a2e',
    border: '1px solid #2a2a40',
    borderRadius: 12,
    padding: '18px 20px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 1.5,
    margin: '0 auto 14px',
    maxWidth: 520,
  },
  errorLine: {
    color: '#ef4444',
    fontSize: 14,
    margin: '4px 0 10px',
    minHeight: 20,
  },
  legal: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    margin: '6px 0 0',
  },
  footer: {
    marginTop: 64,
    textAlign: 'center',
  },
  wordmark: {
    fontSize: 18,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.45)',
    margin: '0 0 6px',
    letterSpacing: '-0.01em',
  },
  copyright: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    margin: 0,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
};
