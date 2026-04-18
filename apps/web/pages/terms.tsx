import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CONTENT = `
<h1>Terms of Service</h1>
<p class="subtitle"><strong>Effective date:</strong> April 2026</p>

<p>These Terms of Service ("Terms") govern your use of the Truvex mobile app and the website at truvex.app (the "Service"). Truvex is operated as a sole proprietorship by Ozan Atmar ("Truvex," "we," "us," or "our"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>

<h2>Who can use Truvex</h2>
<p>You must be at least 18 years old, or the age of majority in your jurisdiction, to create a Truvex account. The Service is not directed to, and may not be used by, children under 13. Truvex is intended for use in the United States by restaurants, hospitality businesses, and their staff.</p>

<h2>Accounts</h2>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You agree to provide accurate information and to keep it up to date. Notify us immediately at <strong>support@truvex.app</strong> if you suspect unauthorized use of your account.</p>

<h2>Managers, workers, and the role of Truvex</h2>
<p>Truvex is a communication tool that helps managers post shift callouts and helps off-duty workers see and respond to them. <strong>Truvex is not an employer, staffing agency, or party to any employment relationship</strong> between managers and workers. Decisions about hiring, scheduling, pay, discipline, and compliance with labor laws are the sole responsibility of the manager and the business they represent. We do not guarantee that a callout will be filled, that a worker will show up, or that any particular outcome will result from using the Service.</p>

<h2>Subscriptions and billing</h2>
<p>Workers use Truvex at no cost. Managers choose between the following plans:</p>
<ul>
<li><strong>Free</strong> — permanent free tier, up to 10 workers.</li>
<li><strong>Pro</strong> — $49 per month or $468 per year.</li>
<li><strong>Business</strong> — $99 per month or $948 per year.</li>
</ul>
<p>Paid plans include a 14-day free trial. You will not be charged during the trial, and you may cancel at any time before it ends to avoid being billed. At the end of the trial, your selected plan will renew automatically at the price shown at signup, and it will continue to renew each billing period until you cancel.</p>
<p>All billing is processed on the web through <strong>Stripe</strong>. Truvex does not bill through Apple or Google in-app purchases, and Truvex does not store your payment card information. By providing payment details, you authorize us, through Stripe, to charge your payment method for the applicable subscription fees, taxes, and any other charges you incur.</p>

<h2>Cancellation and refunds</h2>
<p>You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period, and you will keep access to paid features until then. We do not provide prorated refunds for partial periods.</p>
<p><strong>First-charge refund:</strong> if you are unsatisfied with a paid plan, email <strong>support@truvex.app</strong> within 7 days of your first charge on that plan and we will refund that charge. This refund applies only to the first charge on a given plan and does not apply to renewal charges or subsequent billing periods.</p>

<h2>Acceptable use</h2>
<p>You agree not to use the Service to violate any law; harass, threaten, or defraud any person; post false or misleading shift information; impersonate another person or business; send unsolicited marketing; interfere with or disrupt the Service; attempt to access accounts or data you are not authorized to access; reverse engineer or scrape the Service; or use the Service in any way that could damage Truvex or its users. We may suspend or terminate accounts that violate these rules.</p>

<h2>Intellectual property</h2>
<p>Truvex, including its software, design, logos, and content we create, is owned by Ozan Atmar and protected by applicable intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms. You retain ownership of the content you submit (such as shift details and worker rosters), and you grant us a license to host, process, and display that content as needed to operate the Service.</p>

<h2>Third-party services</h2>
<p>The Service relies on third-party providers including Supabase, Stripe, Twilio, Expo, and Vercel. Your use of the Service may also be subject to the terms of those providers. We are not responsible for outages, errors, or actions of third-party providers, though we work to choose reliable partners.</p>

<h2>Disclaimer of warranties</h2>
<p>The Service is provided <strong>"as is" and "as available"</strong> without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, secure, or free of viruses. Any reliance on the Service is at your own risk.</p>

<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, Truvex and Ozan Atmar will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or business opportunities, arising out of or related to your use of the Service. Our total liability for any claim arising out of or relating to the Service is limited to the greater of (a) the amount you paid Truvex in the 12 months before the event giving rise to the claim, or (b) one hundred US dollars ($100).</p>

<h2>Indemnification</h2>
<p>You agree to indemnify and hold harmless Truvex and Ozan Atmar from any claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising out of your use of the Service, your content, or your violation of these Terms or applicable law.</p>

<h2>Termination</h2>
<p>You may stop using the Service at any time by canceling your subscription and deleting your account. We may suspend or terminate your access to the Service at any time, with or without notice, if we believe you have violated these Terms or if we need to do so to protect the Service or other users. Sections that by their nature should survive termination will do so.</p>

<h2>Governing law and disputes</h2>
<p>These Terms are governed by the laws of the United States, without regard to conflict of laws principles. Any dispute arising out of or relating to these Terms or the Service will be resolved in the US courts of competent jurisdiction, and you and Truvex consent to personal jurisdiction there. You agree that any claim must be brought on an individual basis and not as part of a class or representative action.</p>

<h2>Changes to these Terms</h2>
<p>We may update these Terms from time to time. If we make material changes, we will post the updated Terms at truvex.app and update the effective date. Continued use of the Service after changes means you accept the updated Terms.</p>

<h2>Contact</h2>
<p>Questions about these Terms can be sent to <strong>support@truvex.app</strong>.</p>
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

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms of Service &mdash; Truvex</title>
        <meta name="description" content="Truvex Terms of Service &mdash; the rules governing your use of the Truvex app and website." />
        <link rel="canonical" href="https://truvex.app/terms" />
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
