import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CONTACT_CSS = `
  body { background: #FAFAF8; }
  .contact-layout { display: grid; grid-template-columns: 1fr; gap: 48px; }
  @media (min-width: 860px) { .contact-layout { grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; } }
  .anim { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease-out, transform 0.55s ease-out; }
  .anim.visible { opacity: 1; transform: translateY(0); }
  .anim-d1 { transition-delay: 80ms; }
  .anim-d2 { transition-delay: 160ms; }
  .anim-d3 { transition-delay: 240ms; }
  @keyframes pulse-green { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.5); } 70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } }
  .pulse-dot { animation: pulse-green 2s infinite; }
`;

const CARDS = [
  {
    href: 'mailto:support@truvex.app',
    label: 'EMAIL',
    title: 'support@truvex.app',
    desc: 'General questions, billing, account issues.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    href: '/blog',
    label: 'RESOURCES',
    title: 'Blog & guides',
    desc: 'Practical reads on shift coverage and restaurant staffing.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    href: '/about',
    label: 'FOUNDER',
    title: 'About Ozan Atmar',
    desc: "Why Truvex was built and who's behind it.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Contact() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', topic: '', message: '' });

  useEffect(() => {
    const els = document.querySelectorAll('.anim');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};
    if (!form.firstName.trim()) newErrors.firstName = true;
    if (!form.email.trim()) newErrors.email = true;
    if (!form.message.trim()) newErrors.message = true;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSending(true);
    const fullName = form.lastName ? `${form.firstName} ${form.lastName}` : form.firstName;
    const topic = form.topic || 'General question';
    const subject = `[Truvex Contact] ${topic} — ${fullName}`;
    const body = `From: ${fullName}\nEmail: ${form.email}\nTopic: ${topic}\n\nMessage:\n${form.message}`;
    window.location.href = `mailto:support@truvex.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => { setSending(false); setSubmitted(true); }, 800);
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: '#FAFAF8',
    border: `1.5px solid ${errors[field] ? '#E8634A' : focusedInput === field ? '#0E7C7B' : '#E0E0E8'}`,
    borderRadius: 10,
    padding: '11px 14px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: '#1A1A2E',
    outline: 'none',
    boxSizing: 'border-box' as const,
    boxShadow: focusedInput === field ? '0 0 0 3px rgba(14,124,123,0.12)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const cardContent = (card: typeof CARDS[number], i: number) => {
    const hovered = hoveredCard === i;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#fff',
          border: `1px solid ${hovered ? '#0E7C7B' : '#E0E0E8'}`,
          borderRadius: 14,
          padding: '22px 24px',
          textDecoration: 'none',
          color: 'inherit',
          boxShadow: hovered ? '0 4px 20px rgba(14,124,123,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(14,124,123,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {card.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginBottom: 3 }}>{card.label}</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 2 }}>{card.title}</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6A6A7A' }}>{card.desc}</p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={hovered ? '#0E7C7B' : '#C0C0CC'}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: hovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s, stroke 0.2s' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Contact &mdash; Truvex</title>
        <meta name="description" content="Get in touch with Truvex. Real people, fast replies." />
        <link rel="canonical" href="https://truvex.app/contact" />
        <meta name="theme-color" content="#0E7C7B" />
        <style>{CONTACT_CSS}</style>
      </Head>

      <Navbar activePage="contact" />

      <main style={{ background: '#FAFAF8', minHeight: '70vh' }}>
        <div style={s.container}>
          <div className="contact-layout">

            {/* LEFT COLUMN */}
            <div>
              <span style={s.eyebrow} className="anim">GET IN TOUCH</span>
              <h1 style={s.heading} className="anim">We read every message.</h1>
              <p style={s.subtitle} className="anim">
                Questions about the app, billing, or getting your team set up &mdash; send a message and you&rsquo;ll hear back from a real person, not a support bot.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 36 }}>
                {CARDS.map((card, i) =>
                  card.href.startsWith('/') ? (
                    <Link
                      key={card.label}
                      href={card.href}
                      className={`anim anim-d${i + 1}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                      onMouseEnter={() => setHoveredCard(i)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {cardContent(card, i)}
                    </Link>
                  ) : (
                    <a
                      key={card.label}
                      href={card.href}
                      className={`anim anim-d${i + 1}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                      onMouseEnter={() => setHoveredCard(i)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {cardContent(card, i)}
                    </a>
                  )
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28 }} className="anim">
                <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, display: 'block' }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6A6A7A' }}>
                  Usually replies within a few hours during business days
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="anim">
              <div style={s.formCard}>
                {!submitted ? (
                  <>
                    <h2 style={s.formTitle}>Send a message</h2>
                    <p style={s.formSubtitle}>Fill in the form and we&rsquo;ll get back to you by email.</p>
                    <form onSubmit={handleSubmit} noValidate>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div>
                          <label style={s.label}>First name *</label>
                          <input
                            type="text"
                            placeholder="Jane"
                            value={form.firstName}
                            onChange={handleChange('firstName')}
                            onFocus={() => setFocusedInput('firstName')}
                            onBlur={() => setFocusedInput(null)}
                            style={inputStyle('firstName')}
                          />
                        </div>
                        <div>
                          <label style={s.label}>Last name</label>
                          <input
                            type="text"
                            placeholder="Doe"
                            value={form.lastName}
                            onChange={handleChange('lastName')}
                            onFocus={() => setFocusedInput('lastName')}
                            onBlur={() => setFocusedInput(null)}
                            style={inputStyle('lastName')}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={s.label}>Email address *</label>
                        <input
                          type="email"
                          placeholder="jane@example.com"
                          value={form.email}
                          onChange={handleChange('email')}
                          onFocus={() => setFocusedInput('email')}
                          onBlur={() => setFocusedInput(null)}
                          style={inputStyle('email')}
                        />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={s.label}>Topic</label>
                        <select
                          value={form.topic}
                          onChange={handleChange('topic')}
                          onFocus={() => setFocusedInput('topic')}
                          onBlur={() => setFocusedInput(null)}
                          style={{ ...inputStyle('topic'), color: form.topic ? '#1A1A2E' : '#9A9AAA', appearance: 'auto' }}
                        >
                          <option value="" disabled>Select a topic</option>
                          <option value="General question">General question</option>
                          <option value="Pricing & billing">Pricing &amp; billing</option>
                          <option value="Getting set up">Getting set up</option>
                          <option value="Something isn't working">Something isn&rsquo;t working</option>
                          <option value="Feedback or suggestion">Feedback or suggestion</option>
                          <option value="Partnership or press">Partnership or press</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: 22 }}>
                        <label style={s.label}>Message *</label>
                        <textarea
                          placeholder="What's on your mind?"
                          value={form.message}
                          onChange={handleChange('message')}
                          onFocus={() => setFocusedInput('message')}
                          onBlur={() => setFocusedInput(null)}
                          style={{ ...inputStyle('message'), minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sending}
                        style={{
                          width: '100%',
                          background: sending ? '#C0C0CC' : '#F5853F',
                          color: '#fff',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: 16,
                          padding: '14px',
                          borderRadius: 12,
                          border: 'none',
                          cursor: sending ? 'not-allowed' : 'pointer',
                          transition: 'background 0.2s, transform 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (!sending) {
                            e.currentTarget.style.background = '#E0712E';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sending) {
                            e.currentTarget.style.background = '#F5853F';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {sending ? 'Sending\u2026' : 'Send message'}
                      </button>

                      <p style={{ textAlign: 'center', fontSize: 12, color: '#A0A0B0', marginTop: 14 }}>
                        No spam. We only use your email to reply to you.
                      </p>
                    </form>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(14,124,123,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E7C7B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 12 }}>Message sent.</h2>
                    <p style={{ fontFamily: "'Lora', serif", fontSize: 16, color: '#4A4A5A', lineHeight: 1.7, maxWidth: 320 }}>
                      Thanks for reaching out. You&rsquo;ll hear back from us at the email you provided, usually within a few hours.
                    </p>
                  </div>
                )}
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
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 'clamp(48px, 6vw, 80px) 24px clamp(64px, 8vw, 112px)',
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
    fontSize: 'clamp(32px, 4.5vw, 46px)' as unknown as number,
    fontWeight: 800,
    color: '#1A1A2E',
    marginBottom: 16,
    lineHeight: 1.1,
  },
  subtitle: {
    fontFamily: "'Lora', serif",
    fontSize: 18,
    color: '#4A4A5A',
    lineHeight: 1.7,
  },
  formCard: {
    background: '#fff',
    border: '1px solid #E0E0E8',
    borderRadius: 20,
    padding: 44,
    boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
  },
  formTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A2E',
    marginBottom: 6,
  },
  formSubtitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: '#6A6A7A',
    marginBottom: 28,
  },
  label: {
    display: 'block',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: '#4A4A5A',
    marginBottom: 6,
  },
};
