import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NavbarProps {
  activePage?: 'home' | 'about' | 'blog' | 'contact';
  heroSectionId?: string;
}

export default function Navbar({ activePage, heroSectionId }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(!heroSectionId);

  useEffect(() => {
    if (!heroSectionId) return;
    const hero = document.getElementById(heroSectionId);
    if (!hero) { setScrolled(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-68px 0px 0px 0px' }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, [heroSectionId]);

  const prefix = activePage === 'home' ? '' : '/';

  const navStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    background: scrolled ? 'rgba(250,250,248,0.97)' : 'transparent',
    boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.07)' : 'none',
    backdropFilter: scrolled ? 'blur(10px)' : 'none',
    zIndex: 100,
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
  };

  const barStyle = (index: number): React.CSSProperties => {
    if (index === 0 && menuOpen) return { ...s.bar, transform: 'translateY(7px) rotate(45deg)' };
    if (index === 1) return { ...s.bar, opacity: menuOpen ? 0 : 1 };
    if (index === 2 && menuOpen) return { ...s.bar, transform: 'translateY(-7px) rotate(-45deg)' };
    return s.bar;
  };

  return (
    <header>
      <nav style={navStyle} id="mainNav" role="navigation" aria-label="Main navigation">
        <div style={s.container}>
          <div style={s.navInner}>
            <Link href="/" style={s.navLogo} aria-label="Truvex home">Truvex</Link>
            <ul className="blog-nav-links" role="list">
              <li>
                <Link href={`${prefix}#how-it-works`} style={s.navLink}>Features</Link>
              </li>
              <li>
                <Link href={`${prefix}#pricing`} style={s.navLink}>Pricing</Link>
              </li>
              <li>
                <Link href={`${prefix}#faq`} style={s.navLink}>FAQ</Link>
              </li>
              <li>
                <Link
                  href="/about"
                  style={activePage === 'about' ? { ...s.navLink, color: '#0E7C7B' } : s.navLink}
                  aria-current={activePage === 'about' ? 'page' : undefined}
                >
                  About
                </Link>
              </li>
            </ul>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Link href={`${prefix}#pricing`} className="site-nav-cta" style={s.btnPrimary}>
                Start Free Trial
              </Link>
              <button
                className="site-hamburger"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
              >
                <span style={barStyle(0)} />
                <span style={barStyle(1)} />
                <span style={barStyle(2)} />
              </button>
            </div>
          </div>
        </div>
      </nav>
      {menuOpen && (
        <div style={s.mobileMenu} aria-hidden={false}>
          <Link href={`${prefix}#how-it-works`} style={s.mobileLink} onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href={`${prefix}#pricing`} style={s.mobileLink} onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link href={`${prefix}#faq`} style={s.mobileLink} onClick={() => setMenuOpen(false)}>FAQ</Link>
          <Link href="/about" style={s.mobileLink} onClick={() => setMenuOpen(false)}>About</Link>
          <Link
            href={`${prefix}#pricing`}
            style={{ ...s.btnPrimary, textAlign: 'center', marginTop: 14 }}
            onClick={() => setMenuOpen(false)}
          >
            Start Free Trial
          </Link>
        </div>
      )}
    </header>
  );
}

const s: Record<string, React.CSSProperties> = {
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
    flexShrink: 0,
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
    border: 'none',
    cursor: 'pointer',
  },
  bar: {
    display: 'block',
    width: 22,
    height: 2,
    background: '#1A1A2E',
    borderRadius: 2,
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    borderTop: '1px solid #C4C4D0',
    padding: '8px 24px 24px',
    position: 'sticky' as const,
    top: 68,
    zIndex: 99,
  },
  mobileLink: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 17,
    fontWeight: 600,
    color: '#1A1A2E',
    padding: '14px 0',
    borderBottom: '1px solid #F0F0F5',
    textDecoration: 'none',
    display: 'block',
  },
};
