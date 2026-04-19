import Head from 'next/head';
import { useEffect } from 'react';
import { GetServerSideProps } from 'next';

interface Props {
  returnTo: string;
}

// Landing page after returning from Stripe Customer Portal
export default function SubscriptionReturnPage({ returnTo }: Props) {
  useEffect(() => {
    // Attempt to open the app deep link
    window.location.href = returnTo;
  }, [returnTo]);

  return (
    <>
      <Head>
        <title>Redirecting — Truvex</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>Truvex</h1>
          <p style={styles.text}>Opening the app…</p>
          <p style={styles.sub}>If the app doesn't open automatically, you can close this tab.</p>
          <a href={returnTo} style={styles.link}>Open Truvex</a>
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
    textAlign: 'center',
  },
  logo: { color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 },
  text: { color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 },
  sub: { color: '#666', fontSize: 14, margin: 0 },
  link: {
    background: '#F5853F',
    color: '#fff',
    borderRadius: 10,
    padding: '12px 24px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 15,
    marginTop: 8,
    alignSelf: 'center',
  },
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const raw = typeof ctx.query.return_to === 'string' ? ctx.query.return_to : '';
  const safe = /^(https?:\/\/|truvex:\/\/|exp(\+[\w-]+)?:\/\/)/i.test(raw);
  return { props: { returnTo: safe ? raw : 'truvex://subscription-updated' } };
};
