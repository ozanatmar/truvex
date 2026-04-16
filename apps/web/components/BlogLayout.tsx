import Link from 'next/link';

interface Props {
  children: React.ReactNode;
}

export default function BlogLayout({ children }: Props) {
  return (
    <div style={styles.page}>

      {/* ── NAV ── */}
      <header>
        <nav style={styles.nav} role="navigation" aria-label="Main navigation">
          <div style={styles.container}>
            <div style={styles.navInner}>
              <Link href="/" style={styles.navLogo} aria-label="Truvex home">Truvex</Link>
              <ul className="blog-nav-links" role="list">
                <li><Link href="/#how-it-works" style={styles.navLink}>Features</Link></li>
                <li><Link href="/#pricing" style={styles.navLink}>Pricing</Link></li>
                <li><Link href="/#faq" style={styles.navLink}>FAQ</Link></li>
                <li><Link href="/about.html" style={styles.navLink}>About</Link></li>
              </ul>
              <Link href="/#pricing" style={styles.btnPrimary}>Start Free Trial</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* ── PAGE CONTENT ── */}
      {children}

      {/* ── FOOTER ── */}
      <footer style={styles.footer}>
        <div style={styles.container}>
          <div className="blog-footer-grid">
            <div>
              <p style={styles.footerBrand}>Truvex</p>
              <p style={styles.footerTagline}>One-tap shift coverage for restaurants.</p>
              <div style={styles.footerBadges}>
                <a href="/#download" style={styles.appBadge} aria-label="Download on App Store">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/></svg>
                  <div style={styles.appBadgeText}>
                    <span style={styles.appBadgeSub}>Download on the</span>
                    <span style={styles.appBadgeName}>App Store</span>
                  </div>
                </a>
                <a href="/#download" style={styles.appBadge} aria-label="Get it on Google Play">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3.18 23.22c.3.17.63.25.97.25.3 0 .6-.07.88-.2l13.1-7.22-2.8-2.8-12.15 9.97zM1.07 1.57C1.03 1.78 1 2 1 2.22v19.56c0 .22.03.44.07.64L13 11 1.07 1.57zM20.45 10.25l-2.96-1.63-3.14 3.14 3.14 3.14 2.98-1.64c.84-.47.84-1.54-.02-2.01zM4.15.73L17.25 7.95l-2.8 2.8L3.15.98c.3-.13.62-.19.95-.19.36 0 .7.07 1.05.2z" fill="white"/></svg>
                  <div style={styles.appBadgeText}>
                    <span style={styles.appBadgeSub}>Get it on</span>
                    <span style={styles.appBadgeName}>Google Play</span>
                  </div>
                </a>
              </div>
            </div>
            <div>
              <p style={styles.footerColTitle}>Product</p>
              <ul style={styles.footerLinks}>
                <li><Link href="/#how-it-works" style={styles.footerLink}>Features</Link></li>
                <li><Link href="/#pricing" style={styles.footerLink}>Pricing</Link></li>
                <li><Link href="/#faq" style={styles.footerLink}>FAQ</Link></li>
                <li><Link href="/#how-it-works" style={styles.footerLink}>How It Works</Link></li>
              </ul>
            </div>
            <div>
              <p style={styles.footerColTitle}>Company</p>
              <ul style={styles.footerLinks}>
                <li><Link href="/about.html" style={styles.footerLink}>About</Link></li>
                <li><Link href="/blog" style={styles.footerLink}>Blog</Link></li>
                <li><a href="#" style={styles.footerLink}>Contact</a></li>
                <li><a href="mailto:hello@truvex.app" style={styles.footerLink}>hello@truvex.app</a></li>
              </ul>
            </div>
            <div>
              <p style={styles.footerColTitle}>Legal</p>
              <ul style={styles.footerLinks}>
                <li><a href="#" style={styles.footerLink}>Privacy Policy</a></li>
                <li><a href="#" style={styles.footerLink}>Terms of Service</a></li>
                <li><a href="#" style={styles.footerLink}>Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div style={styles.footerBottom}>
            <p style={styles.footerCopy}>© 2026 Truvex. All rights reserved.</p>
            <div style={styles.footerSocial}>
              <a href="https://twitter.com/truvexapp" aria-label="Truvex on Twitter / X" rel="noopener noreferrer" target="_blank" style={styles.socialLink}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/truvexapp" aria-label="Truvex on Instagram" rel="noopener noreferrer" target="_blank" style={styles.socialLink}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="#" aria-label="Truvex on LinkedIn" rel="noopener noreferrer" target="_blank" style={styles.socialLink}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#FAFAF8',
    fontFamily: "'Lora', Georgia, serif",
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    position: 'sticky',
    top: 0,
    background: 'rgba(250,250,248,0.97)',
    boxShadow: '0 1px 20px rgba(0,0,0,0.07)',
    backdropFilter: 'blur(10px)',
    zIndex: 100,
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 32px',
  },
  navInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 68,
    gap: 24,
  },
  navLogo: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#0E7C7B',
    letterSpacing: '-0.3px',
    textDecoration: 'none',
  },
  navLink: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 600,
    color: '#1A1A2E',
    textDecoration: 'none',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5853F',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    padding: '10px 20px',
    borderRadius: 12,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  footer: {
    background: '#1A1A2E',
    padding: '56px 0 0',
    marginTop: 'auto',
  },
  footerBadges: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    marginTop: 16,
  },
  appBadge: {
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
  appBadgeText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  appBadgeSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.2,
  },
  appBadgeName: {
    fontSize: 13,
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  footerBrand: {
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    margin: '0 0 8px',
  },
  footerTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    margin: 0,
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
  },
  footerColTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.35)',
    margin: '0 0 12px',
  },
  footerLinks: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  footerLink: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
    fontFamily: "'DM Sans', sans-serif",
  },
  footerBottom: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '20px 0',
    marginTop: 40,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerCopy: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    margin: 0,
    fontFamily: "'DM Sans', sans-serif",
  },
  footerSocial: {
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
