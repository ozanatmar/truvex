import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact &mdash; Truvex</title>
        <meta name="description" content="Get in touch with the Truvex team. We're real people and we reply fast." />
        <link rel="canonical" href="https://truvex.app/contact" />
        <meta name="theme-color" content="#0E7C7B" />
        <style>{`body{background:#FAFAF8;} @media(min-width:768px){.contact-cards{grid-template-columns:repeat(2,1fr)!important;}} @media(min-width:900px){.contact-grid{grid-template-columns:1fr 1.2fr!important;}}`}</style>
      </Head>

      <Navbar activePage="contact" />

      <main style={s.main}>
        <div style={s.container}>

          {/* Header */}
          <header style={s.header}>
            <span style={s.eyebrow}>Get in touch</span>
            <h1 style={s.heading}>We&rsquo;re real people. We reply fast.</h1>
            <p style={s.subheading}>
              Questions about the product, pricing, or your account? Reach out directly &mdash;
              no ticket system, no chatbot.
            </p>
          </header>

          <div style={s.grid} className="contact-grid">
            {/* Contact cards */}
            <div style={s.cards} className="contact-cards">
              <a href="mailto:hello@truvex.app" style={s.card}>
                <div style={s.cardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <p style={s.cardTitle}>Email us</p>
                  <p style={s.cardValue}>hello@truvex.app</p>
                  <p style={s.cardNote}>We reply within 24 hours on business days</p>
                </div>
              </a>

              <a href="https://twitter.com/truvexapp" target="_blank" rel="noopener noreferrer" style={s.card}>
                <div style={s.cardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#0E7C7B">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <p style={s.cardTitle}>Twitter / X</p>
                  <p style={s.cardValue}>@truvexapp</p>
                  <p style={s.cardNote}>For quick questions or feedback</p>
                </div>
              </a>

              <a href="https://www.instagram.com/truvexapp" target="_blank" rel="noopener noreferrer" style={s.card}>
                <div style={s.cardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </div>
                <div>
                  <p style={s.cardTitle}>Instagram</p>
                  <p style={s.cardValue}>@truvexapp</p>
                  <p style={s.cardNote}>Behind-the-scenes and updates</p>
                </div>
              </a>

              <div style={s.card}>
                <div style={s.cardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p style={s.cardTitle}>Based in</p>
                  <p style={s.cardValue}>Varna, Bulgaria</p>
                  <p style={s.cardNote}>Building for the US market</p>
                </div>
              </div>
            </div>

            {/* Right side */}
            <div>
              <div style={s.messageBox}>
                <h2 style={s.messageTitle}>Send us a message</h2>
                <p style={s.messageDesc}>
                  The fastest way to reach us is email at{' '}
                  <a href="mailto:hello@truvex.app" style={s.inlineLink}>hello@truvex.app</a>.
                  We read every message and reply personally.
                </p>
                <a href="mailto:hello@truvex.app" style={s.ctaBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Email hello@truvex.app
                </a>
              </div>

              <div style={s.faqBox}>
                <h2 style={s.faqTitle}>Common questions</h2>
                {[
                  { q: 'How do I cancel my subscription?', a: 'Cancel any time from the app settings. You keep access until the end of your billing period.' },
                  { q: 'Can I get a refund?', a: 'Email us within 7 days of your first charge. We\u2019ll sort it out.' },
                  { q: 'I\u2019m a worker, how do I join a restaurant?', a: 'Ask your manager to add you. They\u2019ll send you an SMS invite.' },
                  { q: 'Is there a demo or trial?', a: 'Yes \u2014 14-day free trial, no credit card required. Sign up from the home page.' },
                ].map((item) => (
                  <div key={item.q} style={s.faqItem}>
                    <p style={s.faqQ}>{item.q}</p>
                    <p style={s.faqA}>{item.a}</p>
                  </div>
                ))}
                <p style={s.faqMore}>
                  More answers on the{' '}
                  <Link href="/#faq" style={s.inlineLink}>FAQ page</Link>.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: {
    background: '#FAFAF8',
    minHeight: '60vh',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 'clamp(48px, 6vw, 80px) 24px clamp(64px, 8vw, 112px)',
  },
  header: {
    maxWidth: 620,
    marginBottom: 56,
  },
  eyebrow: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    color: '#0E7C7B',
    marginBottom: 16,
    display: 'block',
  },
  heading: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 'clamp(32px, 4.5vw, 48px)' as unknown as number,
    fontWeight: 800,
    color: '#1A1A2E',
    marginBottom: 16,
    lineHeight: 1.1,
  },
  subheading: {
    fontSize: 18,
    color: '#4A4A5A',
    lineHeight: 1.7,
    fontFamily: "'Lora', serif",
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 40,
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
  },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 20,
    background: '#fff',
    borderRadius: 16,
    padding: '24px 28px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'rgba(14,124,123,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#8A8A9A',
    marginBottom: 4,
  },
  cardValue: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 17,
    fontWeight: 700,
    color: '#1A1A2E',
    marginBottom: 4,
  },
  cardNote: {
    fontSize: 14,
    color: '#6A6A7A',
    fontFamily: "'DM Sans', sans-serif",
  },
  messageBox: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
    marginBottom: 24,
  },
  messageTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A2E',
    marginBottom: 12,
  },
  messageDesc: {
    fontSize: 16,
    color: '#4A4A5A',
    lineHeight: 1.7,
    marginBottom: 24,
    fontFamily: "'Lora', serif",
  },
  ctaBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: '#F5853F',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    padding: '14px 28px',
    borderRadius: 12,
    textDecoration: 'none',
  },
  faqBox: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
  },
  faqTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 18,
    fontWeight: 800,
    color: '#1A1A2E',
    marginBottom: 20,
  },
  faqItem: {
    paddingBottom: 18,
    marginBottom: 18,
    borderBottom: '1px solid #F0F0F5',
  },
  faqQ: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: '#1A1A2E',
    marginBottom: 4,
  },
  faqA: {
    fontSize: 14,
    color: '#4A4A5A',
    lineHeight: 1.6,
  },
  faqMore: {
    fontSize: 14,
    color: '#4A4A5A',
    marginTop: 8,
  },
  inlineLink: {
    color: '#0E7C7B',
    textDecoration: 'underline',
  },
};
