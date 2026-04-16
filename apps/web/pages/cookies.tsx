import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Cookies() {
  return (
    <>
      <Head>
        <title>Cookie Policy &mdash; Truvex</title>
        <meta name="description" content="Truvex Cookie Policy &mdash; how we use cookies and similar technologies." />
        <link rel="canonical" href="https://truvex.app/cookies" />
        <meta name="robots" content="noindex" />
        <style>{`body{background:#FAFAF8;} .legal-body h2{font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;color:#1A1A2E;margin:36px 0 12px;} .legal-body p{margin-bottom:20px;}`}</style>
      </Head>

      <Navbar />

      <main style={s.main}>
        <div style={s.container}>
          <span style={s.eyebrow}>Legal</span>
          <h1 style={s.heading}>Cookie Policy</h1>
          <p style={s.updated}>Last updated: April 2026</p>

          <div style={s.body} className="legal-body">
            <p>
              This Cookie Policy explains how Truvex uses cookies and similar tracking technologies
              on truvex.app. By using the site, you consent to the use of cookies as described here.
            </p>

            <h2>What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              They help the website remember your preferences and understand how you use the site.
            </p>

            <h2>Cookies We Use</h2>
            <p>
              <strong>Essential cookies</strong> are required for the website to function.
              These include session cookies that keep you logged in during a browsing session.
              You cannot opt out of essential cookies while using the site.
            </p>
            <p>
              <strong>Analytics cookies</strong> help us understand how visitors interact with truvex.app.
              We may use anonymized analytics to improve the product. No personal data is shared with third-party ad networks.
            </p>

            <h2>Third-Party Cookies</h2>
            <p>
              Our payment processor (Stripe) and authentication provider (Supabase) may set cookies necessary
              for their services to function. These are governed by their respective cookie policies.
            </p>

            <h2>Managing Cookies</h2>
            <p>
              Most browsers allow you to control cookies through their settings.
              Blocking essential cookies may affect site functionality.
              For more information, visit your browser&rsquo;s help documentation.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about our use of cookies? Email{' '}
              <a href="mailto:hello@truvex.app" style={s.link}>hello@truvex.app</a>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: { background: '#FAFAF8', minHeight: '60vh' },
  container: { maxWidth: 720, margin: '0 auto', padding: 'clamp(48px,6vw,80px) 24px clamp(64px,8vw,112px)' },
  eyebrow: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#0E7C7B', marginBottom: 16, display: 'block' },
  heading: { fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(28px,4vw,40px)' as unknown as number, fontWeight: 800, color: '#1A1A2E', marginBottom: 8, lineHeight: 1.1 },
  updated: { fontSize: 14, color: '#8A8A9A', fontFamily: "'DM Sans', sans-serif", marginBottom: 48 },
  body: { fontSize: 17, lineHeight: 1.8, color: '#2A2A3A', fontFamily: "'Lora', serif" },
  link: { color: '#0E7C7B', textDecoration: 'underline' },
};
