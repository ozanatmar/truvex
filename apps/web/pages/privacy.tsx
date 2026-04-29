import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy &mdash; Truvex</title>
        <meta name="description" content="Truvex Privacy Policy — how we collect, use, and protect your data." />
        <link rel="canonical" href="https://truvex.app/privacy" />
        <meta name="robots" content="noindex" />
        <style>{`body{background:#FAFAF8;} .legal-body h2{font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;color:#1A1A2E;margin:36px 0 12px;} .legal-body p{margin-bottom:20px;}`}</style>
      </Head>

      <Navbar />

      <main style={s.main}>
        <div style={s.container}>
          <span style={s.eyebrow}>Legal</span>
          <h1 style={s.heading}>Privacy Policy</h1>
          <p style={s.updated}>Last updated: April 18, 2026</p>

          <div style={s.body} className="legal-body">
            <p>
              Truvex is a product of Atmar Horeca EOOD, a company registered in Bulgaria under UIC 205062463,
              with registered address str. Manol Lazarov 67, 9022 Varna, Bulgaria.
              In this Privacy Policy, &ldquo;we&rdquo;, &ldquo;us&rdquo;, and &ldquo;our&rdquo; refer to Atmar Horeca EOOD.
              This policy explains how we collect, use, disclose, and safeguard your information
              when you use the Truvex mobile application and the website at truvex.app.
            </p>

            <h2>Information We Collect</h2>
            <p>
              We collect your phone number to create and verify your account via SMS one-time password (OTP).
              We also collect your name (as entered or assigned by a manager), your Expo push notification token
              to deliver in-app notifications, and your usage data such as callouts posted, shifts accepted, and response times.
            </p>

            <h2>How We Use Your Information</h2>
            <p>
              We use your information to operate the Truvex service, including sending shift callout notifications via push
              and SMS, authenticating your account, and displaying your profile to managers and co-workers at your location.
              We do not sell your personal data to third parties.
            </p>

            <h2>Third-Party Services</h2>
            <p>
              We use the following third-party services: <strong>Supabase</strong> (database and authentication),
              <strong>Twilio</strong> (SMS delivery for authentication and shift notifications),
              <strong>Expo</strong> (push notification delivery), and <strong>Stripe</strong> (payment processing for paid plans).
              Each of these services has its own privacy policy governing how they handle your data.
            </p>

            <h2>SMS and Phone Number Data</h2>
            <p>
              When you create a Truvex account, we collect your mobile phone number to send you verification codes
              and shift-related notifications as described in our Terms of Service. We use Twilio, a third-party SMS
              provider, to deliver these messages. Twilio processes your phone number solely for message delivery
              and is bound by its own privacy terms.
            </p>
            <p>
              Your phone number and SMS opt-in status are never sold, rented, or shared with third parties for marketing,
              advertising, or promotional purposes. Mobile information will not be shared with third parties or affiliates
              for marketing or promotional purposes.
            </p>
            <p>
              You can revoke SMS consent at any time by replying STOP to any Truvex message. Revoking SMS consent does not
              delete your Truvex account. You will continue to receive notifications through the mobile app via push
              notifications. Opting out of SMS does not remove your obligation to respond to shift communications from
              your employer through other channels.
            </p>

            <h2>Device Contacts</h2>
            <p>
              If you are a manager, the app may request access to your device contacts to help you quickly
              add workers to your team by selecting from your existing contacts. Contact data is used solely
              to pre-fill the worker&rsquo;s name and phone number in the add-worker form. We do not upload,
              store, or share your contact list with any third party. Contact access is optional — you can
              add workers manually without granting this permission.
            </p>

            <h2>Data Retention</h2>
            <p>
              Your account data is retained while your account is active. If you request account deletion,
              we will delete your profile and associated data within 30 days, except where retention is required by law.
            </p>

            <h2>Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data. To exercise these rights,
              email us at <a href="mailto:hello@truvex.app" style={s.link}>hello@truvex.app</a>.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about this policy? Email us at{' '}
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
