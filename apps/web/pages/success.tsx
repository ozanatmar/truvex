import { useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

interface Props {
  returnTo: string;
}

export default function SuccessPage({ returnTo }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = returnTo;
    }, 2000);
    return () => clearTimeout(timer);
  }, [returnTo]);

  return (
    <>
      <Head>
        <title>Payment successful — Truvex</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.checkmark}>✓</div>
          <h1 style={styles.title}>You're upgraded!</h1>
          <p style={styles.subtitle}>
            Your plan is now active. Returning you to Truvex…
          </p>
          <a href={returnTo} style={styles.link}>
            Open Truvex
          </a>
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
  },
  card: {
    background: '#2a2a40',
    borderRadius: 16,
    padding: '48px 40px',
    maxWidth: 400,
    width: '90%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  checkmark: {
    width: 72,
    height: 72,
    background: '#10b981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    color: '#fff',
    fontWeight: 800,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: 800, margin: 0 },
  subtitle: { color: '#aaa', fontSize: 16, margin: 0 },
  link: {
    background: '#F5853F',
    color: '#fff',
    borderRadius: 10,
    padding: '12px 32px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 16,
    marginTop: 8,
  },
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const raw = typeof ctx.query.return_to === 'string' ? ctx.query.return_to : '';
  // Accept only custom schemes or https URLs — avoid being an open redirect.
  const safe = /^(https?:\/\/|truvex:\/\/|exp(\+[\w-]+)?:\/\/)/i.test(raw);
  return { props: { returnTo: safe ? raw : 'truvex://upgrade-success' } };
};
