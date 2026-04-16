import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <meta name="theme-color" content="#1a1a2e" />
        <style>{`html, body { margin: 0; padding: 0; background: #FAFAF8; }`}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
