import Head from 'next/head';

export default function ComingSoon() {
  return (
    <>
      <Head>
        <title>Truvex — Coming Soon</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.logo}>Truvex</p>
          <h1 style={styles.heading}>Coming Soon</h1>
          <p style={styles.body}>
            We're putting the finishing touches on something built for
            restaurant and hospitality managers. Check back soon.
          </p>
          <a href="mailto:support@truvex.app" style={styles.link}>
            support@truvex.app
          </a>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0f0f1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif",
    padding: '24px',
  },
  card: {
    textAlign: 'center',
    maxWidth: 420,
  },
  logo: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0E7C7B',
    margin: '0 0 32px',
    letterSpacing: '-0.3px',
  },
  heading: {
    fontSize: 40,
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 16px',
    lineHeight: 1.1,
  },
  body: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.7,
    margin: '0 0 28px',
  },
  link: {
    fontSize: 14,
    color: '#0E7C7B',
    textDecoration: 'none',
  },
};
