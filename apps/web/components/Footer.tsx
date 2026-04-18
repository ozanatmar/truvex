import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={s.footer}>
      <div style={s.container}>
        <div className="blog-footer-grid">
          <div>
            <p style={s.brand}>Truvex</p>
            <p style={s.tagline}>One-tap shift coverage for restaurants.</p>
          </div>

          <div>
            <p style={s.colTitle}>Product</p>
            <ul style={s.linkList}>
              <li><Link href="/#how-it-works" style={s.link}>Features</Link></li>
              <li><Link href="/#pricing" style={s.link}>Pricing</Link></li>
              <li><Link href="/#faq" style={s.link}>FAQ</Link></li>
              <li><Link href="/#how-it-works" style={s.link}>How It Works</Link></li>
            </ul>
          </div>

          <div>
            <p style={s.colTitle}>Company</p>
            <ul style={s.linkList}>
              <li><Link href="/about" style={s.link}>About</Link></li>
              <li><Link href="/blog" style={s.link}>Blog</Link></li>
              <li><Link href="/contact" style={s.link}>Contact</Link></li>
              <li><a href="mailto:hello@truvex.app" style={s.link}>hello@truvex.app</a></li>
            </ul>
          </div>

          <div>
            <p style={s.colTitle}>Legal</p>
            <ul style={s.linkList}>
              <li><Link href="/privacy" style={s.link}>Privacy Policy</Link></li>
              <li><Link href="/terms" style={s.link}>Terms of Service</Link></li>
              <li><Link href="/cookies" style={s.link}>Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div style={s.bottom}>
          <p style={s.copy}>© 2026 Truvex. All rights reserved.</p>
          <div style={s.social}>
            <a href="https://twitter.com/truvexapp" aria-label="Truvex on Twitter / X" rel="noopener noreferrer" target="_blank" style={s.socialLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" aria-label="Truvex on LinkedIn" rel="noopener noreferrer" target="_blank" style={s.socialLink}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const s: Record<string, React.CSSProperties> = {
  footer: {
    background: '#1A1A2E',
    padding: '56px 0 0',
    marginTop: 'auto',
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 32px',
  },
  brand: {
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    margin: '0 0 8px',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    margin: '0 0 20px',
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
  },
  badges: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '8px 14px',
    textDecoration: 'none',
    width: 'fit-content',
  },
  badgeText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  badgeSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.2,
  },
  badgeName: {
    fontSize: 13,
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  colTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.35)',
    margin: '0 0 12px',
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  link: {
    display: 'block',
    fontSize: 14,
    lineHeight: '1.6',
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
    fontFamily: "'DM Sans', sans-serif",
  },
  bottom: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '20px 0',
    marginTop: 40,
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    margin: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  social: {
    display: 'flex',
    gap: 14,
  },
  socialLink: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.4)',
    textDecoration: 'none',
  },
};
