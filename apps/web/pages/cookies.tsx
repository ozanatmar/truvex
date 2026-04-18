import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CONTENT = `
<h1>Cookie Policy</h1>
<p class="subtitle"><strong>Effective date:</strong> April 2026</p>

<p>This Cookie Policy explains how Truvex uses cookies and similar technologies on the website at truvex.app. It is a companion to our Privacy Policy and applies only to the web experience. The Truvex mobile apps for iOS and Android do not use browser cookies; they use secure, on-device storage for sign-in and similar functions.</p>

<h2>What cookies are</h2>
<p>Cookies are small text files that a website stores on your device to remember information between visits or across pages. Some cookies are strictly necessary to make a website work. Others help a site remember your preferences or understand how it is being used. Cookies can be set by the website you are visiting (first-party cookies) or by other services the site uses (third-party cookies).</p>

<h2>Cookies Truvex uses</h2>
<p>Truvex uses a small number of cookies, all focused on making the Service work. Specifically:</p>
<ul>
<li><strong>Authentication cookies</strong> — set by our authentication provider, Supabase, to keep you signed in as you move between pages. Without these, you would have to log in repeatedly.</li>
<li><strong>Functional cookies</strong> — used to remember basic preferences, such as whether you have dismissed a notice, so the site behaves consistently between visits.</li>
</ul>

<h2>Cookies Truvex does not use</h2>
<p>We do not use advertising cookies, cross-site tracking cookies, or cookies that build a profile of you for marketing purposes. We do not sell information collected through cookies. Truvex is a tool for managing shifts, not a marketing platform.</p>

<h2>Third-party cookies</h2>
<p>A few cookies on truvex.app are set by services we rely on:</p>
<ul>
<li><strong>Stripe</strong> sets cookies on pages involved in checkout and subscription management. These support fraud prevention and the secure processing of payments.</li>
<li><strong>Vercel</strong>, our web host, may set cookies for basic site performance and, if enabled, for privacy-friendly analytics about page views. Vercel analytics does not use tracking cookies across sites.</li>
</ul>
<p>These third parties manage their own cookies under their own policies. You can learn more at stripe.com and vercel.com.</p>

<h2>Future analytics cookies</h2>
<p>We may add analytics tools in the future to better understand how the Service is used. If we do, we will update this Cookie Policy to describe the new cookies and what they collect before enabling them.</p>

<h2>How to manage or disable cookies</h2>
<p>Most browsers let you view, manage, and delete cookies from their settings. You can typically block all cookies, block third-party cookies only, or clear cookies that have already been set. Helpful links for common browsers:</p>
<ul>
<li>Chrome — Settings &gt; Privacy and security &gt; Cookies and other site data.</li>
<li>Safari — Settings &gt; Privacy &gt; Manage Website Data.</li>
<li>Firefox — Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data.</li>
<li>Edge — Settings &gt; Cookies and site permissions.</li>
</ul>
<p>Blocking authentication or functional cookies will likely prevent you from signing in or using parts of the Service. Blocking third-party cookies from Stripe may prevent you from completing a subscription purchase.</p>

<h2>US focus and international visitors</h2>
<p>Truvex is intended for users in the United States, and US law does not require a cookie consent banner for the limited set of cookies we use. If you visit truvex.app from outside the US, local law may give you additional choices. You can always control cookies through your browser settings as described above.</p>

<h2>Changes to this policy</h2>
<p>We may update this Cookie Policy as our use of cookies changes — for example, when we add analytics. Updates will be posted at truvex.app with a new effective date.</p>

<h2>Contact</h2>
<p>Questions about cookies or this policy can be sent to <strong>support@truvex.app</strong>.</p>
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

export default function Cookies() {
  return (
    <>
      <Head>
        <title>Cookie Policy &mdash; Truvex</title>
        <meta name="description" content="Truvex Cookie Policy &mdash; how we use cookies and similar technologies." />
        <link rel="canonical" href="https://truvex.app/cookies" />
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
