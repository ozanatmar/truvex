import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CONTENT = `
<h1>Privacy Policy</h1>
<p class="subtitle"><strong>Effective date:</strong> April 2026</p>

<p>This Privacy Policy explains how Truvex ("Truvex," "we," "us," or "our") collects, uses, and protects information when you use the Truvex mobile app and website at truvex.app (together, the "Service"). Truvex is operated as a sole proprietorship by Ozan Atmar. We built Truvex to help restaurant and hospitality managers fill shifts quickly, and we take the responsibility of handling your information seriously.</p>

<p>By using Truvex, you agree to the practices described below. If you do not agree, please do not use the Service.</p>

<h2>Who this policy applies to</h2>
<p>Truvex is designed for users in the United States. We do not target users in the European Union, United Kingdom, or other regions with specific data protection regimes, though we recognize individuals outside the US may occasionally access the Service. If you are located outside the US, you understand and agree that your information will be processed in the US and in any country where our service providers operate.</p>
<p>Truvex is not directed to children under 13. We do not knowingly collect personal information from anyone under 13. If we learn we have collected such information, we will delete it promptly.</p>

<h2>Information we collect</h2>
<p>We collect only what we need to run the Service. The information we collect depends on whether you are a manager or a worker.</p>
<p><strong>From managers</strong>, we collect your name, phone number, restaurant name, and location name. We may collect an email address if you provide one for account recovery or billing notifications.</p>
<p><strong>From workers</strong>, we collect your name, phone number, and role or position (for example, server, bartender, line cook).</p>
<p><strong>Automatically</strong>, we collect push notification tokens (issued by Expo) so we can deliver shift alerts to your device. We also collect basic technical information such as device type, operating system, and app version for troubleshooting.</p>
<p><strong>Billing</strong> information (card numbers, expiration dates, CVC) is collected and stored by Stripe, our payment processor. Truvex never sees or stores your card details. We receive only a subscription status and a reference ID from Stripe.</p>

<h2>How we use information</h2>
<p>We use the information we collect to operate the Service, match workers to open shifts, send operational notifications, process subscription payments through Stripe, communicate with you about your account, prevent fraud and abuse, and comply with our legal obligations.</p>

<h2>Push notifications and SMS</h2>
<p>Truvex sends push notifications (via Expo) and SMS messages (via Twilio) for <strong>operational purposes only</strong> — such as notifying a worker that a shift is available or confirming that a manager's callout was posted. We do not send marketing messages. Message and data rates may apply for SMS. You may opt out of SMS by replying STOP to any message, and you may disable push notifications in your device settings. Disabling these channels may make the Service less useful.</p>

<h2>Who we share information with</h2>
<p>We do not sell your personal information. We share information only with the service providers that help us run Truvex, and only to the extent needed for them to perform their function:</p>
<ul>
<li><strong>Supabase</strong> — database and authentication.</li>
<li><strong>Stripe</strong> — subscription billing on the web.</li>
<li><strong>Twilio</strong> — delivery of SMS notifications.</li>
<li><strong>Expo</strong> — delivery of push notifications.</li>
<li><strong>Vercel</strong> — hosting of truvex.app.</li>
</ul>
<p>We may also disclose information if required by law, to enforce our Terms of Service, or to protect the rights, property, or safety of Truvex or our users.</p>

<h2>Analytics</h2>
<p>We do not currently use analytics tools. We may use analytics tools in the future to understand how the Service is used and improve it. This policy will be updated when such tools are added, and we will describe what is collected and how.</p>

<h2>How long we keep information</h2>
<p>We keep account information for as long as your account is active. If you delete your account, we will delete or anonymize your personal information within a reasonable period, except where we need to retain certain records for legal, tax, or fraud-prevention purposes.</p>

<h2>Your choices and rights</h2>
<p>You may request a copy of the personal information we hold about you, ask us to correct inaccurate information, or ask us to delete your account and associated data. To make a request, email <strong>support@truvex.app</strong> from the email or phone number associated with your account. California residents have specific rights under the California Consumer Privacy Act, including the right to know and the right to delete, and may exercise them using the same contact method. We do not sell personal information, so no opt-out of sale is needed.</p>

<h2>Security</h2>
<p>We use reasonable technical and organizational measures to protect your information, including encryption in transit and access controls at our service providers. No system is perfectly secure, and we cannot guarantee absolute security.</p>

<h2>Changes to this policy</h2>
<p>We may update this Privacy Policy from time to time. If we make material changes, we will post the updated policy at truvex.app and update the effective date above. Continued use of the Service after changes means you accept the updated policy.</p>

<h2>Contact us</h2>
<p>Questions or requests about this policy or your information can be sent to <strong>support@truvex.app</strong>.</p>
`;

const LEGAL_CSS = `
body { background: #FAFAF8; }
.legal-body {
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(48px, 6vw, 80px) 24px clamp(64px, 8vw, 100px);
  font-family: 'Lora', Georgia, serif;
  font-size: 18px;
  line-height: 1.8;
  color: #4A4A5A;
}
.legal-body h1 {
  font-family: 'DM Sans', sans-serif;
  font-size: 36px;
  font-weight: 800;
  color: #1A1A2E;
  margin-bottom: 8px;
  line-height: 1.1;
}
.legal-body .subtitle {
  font-size: 14px;
  color: #8A8A9A;
  font-family: 'DM Sans', sans-serif;
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid #E0E0E8;
}
.legal-body h2 {
  font-family: 'DM Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #1A1A2E;
  margin-top: 40px;
  margin-bottom: 12px;
}
.legal-body p { margin-bottom: 20px; }
.legal-body ul { padding-left: 24px; margin-bottom: 20px; }
.legal-body li { margin-bottom: 8px; }
.legal-body strong { color: #1A1A2E; font-weight: 600; }
.legal-body a { color: #0E7C7B; text-decoration: underline; }
`;

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy &mdash; Truvex</title>
        <meta name="description" content="Truvex Privacy Policy — how we collect, use, and protect your data." />
        <link rel="canonical" href="https://truvex.app/privacy" />
        <meta name="robots" content="noindex" />
        <style>{LEGAL_CSS}</style>
      </Head>

      <Navbar />

      <main style={{ background: '#FAFAF8', minHeight: '60vh' }}>
        <div className="legal-body" dangerouslySetInnerHTML={{ __html: CONTENT }} />
      </main>

      <Footer />
    </>
  );
}
