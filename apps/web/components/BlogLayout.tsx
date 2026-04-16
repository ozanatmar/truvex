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
              <a href="https://twitter.com/truvexapp" aria-label="Truvex on X" rel="noopener noreferrer" target="_blank" style={styles.socialLink}>
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
