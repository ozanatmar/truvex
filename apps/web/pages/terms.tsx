import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service &mdash; Truvex</title>
        <meta name="description" content="Truvex Terms of Service &mdash; the rules governing your use of the Truvex app and website." />
        <link rel="canonical" href="https://truvex.app/terms" />
        <meta name="robots" content="noindex" />
        <style>{`body{background:#FAFAF8;} .legal-body h2{font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;color:#1A1A2E;margin:36px 0 12px;} .legal-body p{margin-bottom:20px;}`}</style>
      </Head>

      <Navbar />

      <main style={s.main}>
        <div style={s.container}>
          <span style={s.eyebrow}>Legal</span>
          <h1 style={s.heading}>Terms of Service</h1>
          <p style={s.updated}>Last updated: April 2026</p>

          <div style={s.body} className="legal-body">
            <p>
              By accessing or using Truvex (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>

            <h2>Use of the Service</h2>
            <p>
              Truvex is a shift callout management tool for restaurants and other shift-based workplaces.
              You may use the Service only for lawful purposes and in accordance with these Terms.
              You are responsible for maintaining the confidentiality of your account credentials.
            </p>

            <h2>Accounts</h2>
            <p>
              You must provide a valid phone number to create an account. Each phone number corresponds to one account.
              You are responsible for all activity that occurs under your account.
              Managers who add workers to their location represent that they have the right to do so.
            </p>

            <h2>Subscriptions and Billing</h2>
            <p>
              Paid plans are billed monthly or annually as selected. Your 14-day free trial begins on signup and requires no credit card.
              After the trial, you may continue on the free Starter plan or choose a paid plan.
              Subscription fees are non-refundable except as described in our refund policy.
              You may cancel at any time and retain access through the end of your billing period.
            </p>

            <h2>Prohibited Conduct</h2>
            <p>
              You may not use the Service to send spam, harass other users, reverse-engineer the application,
              or violate any applicable law or regulation.
            </p>

            <h2>Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; without warranties of any kind.
              Truvex does not guarantee that shift notifications will be delivered instantaneously or without interruption.
              We are not liable for any failure to fill a shift or for any damages arising from your use of the Service.
            </p>

            <h2>Termination</h2>
            <p>
              We may terminate or suspend your account at our discretion if you violate these Terms.
              You may terminate your account at any time by contacting us.
            </p>

            <h2>Contact</h2>
            <p>
              Questions? Email <a href="mailto:hello@truvex.app" style={s.link}>hello@truvex.app</a>.
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
