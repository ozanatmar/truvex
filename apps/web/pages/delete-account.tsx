import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function DeleteAccount() {
  return (
    <>
      <Head>
        <title>Delete Account &mdash; Truvex</title>
        <meta name="description" content="Request deletion of your Truvex account and data." />
        <link rel="canonical" href="https://truvex.app/delete-account" />
        <meta name="robots" content="noindex" />
        <style>{`body{background:#FAFAF8;} .legal-body h2{font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;color:#1A1A2E;margin:36px 0 12px;} .legal-body p{margin-bottom:20px;} .legal-body ol{margin-bottom:20px;padding-left:24px;} .legal-body li{margin-bottom:10px;}`}</style>
      </Head>

      <Navbar />

      <main style={s.main}>
        <div style={s.container}>
          <span style={s.eyebrow}>Account</span>
          <h1 style={s.heading}>Delete Your Account</h1>

          <div style={s.body} className="legal-body">
            <p>
              You can request deletion of your Truvex account and all associated data at any time.
              To submit a deletion request, email us at{' '}
              <a href="mailto:hello@truvex.app" style={s.link}>hello@truvex.app</a> from the phone
              number associated with your account, or include your phone number in the email.
            </p>

            <h2>What gets deleted</h2>
            <p>
              Upon request, we will permanently delete your account and all associated data within 30 days, including:
            </p>
            <ol>
              <li>Your profile (name, phone number, push notification token)</li>
              <li>Your membership records for all locations</li>
              <li>Your shift response history</li>
              <li>Any locations you manage, including all workers, roles, callouts, and notification logs for those locations</li>
            </ol>

            <h2>What is retained</h2>
            <p>
              We may retain certain data where required by law or for legitimate business purposes such as
              fraud prevention, for a period not exceeding 90 days after deletion.
            </p>

            <h2>Contact</h2>
            <p>
              To submit your deletion request, email{' '}
              <a href="mailto:hello@truvex.app" style={s.link}>hello@truvex.app</a> with the subject line
              &ldquo;Account Deletion Request&rdquo; and include your registered phone number.
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
  heading: { fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(28px,4vw,40px)' as unknown as number, fontWeight: 800, color: '#1A1A2E', marginBottom: 48, lineHeight: 1.1 },
  body: { fontSize: 17, lineHeight: 1.8, color: '#2A2A3A', fontFamily: "'Lora', serif" },
  link: { color: '#0E7C7B', textDecoration: 'underline' },
};
