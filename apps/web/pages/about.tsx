import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ABOUT_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  :root {
    --color-primary: #0E7C7B; --color-secondary: #E8634A; --color-cta: #F5853F;
    --color-cta-hover: #E0712E; --color-heading: #1A1A2E; --color-body: #4A4A5A;
    --color-border: #C4C4D0; --color-card-bg: #F0F0F5; --color-page-bg: #FAFAF8;
    --font-heading: 'DM Sans', sans-serif; --font-body: 'Lora', serif;
    --radius-md: 12px; --radius-lg: 20px; --container: 1200px;
  }
  body { font-family: var(--font-body); font-size: 18px; color: var(--color-body); background: var(--color-page-bg); line-height: 1.6; -webkit-font-smoothing: antialiased; }
  h1,h2,h3,h4 { font-family: var(--font-heading); color: var(--color-heading); line-height: 1.2; }
  a { text-decoration: none; color: inherit; }
  img { max-width: 100%; height: auto; display: block; }
  :focus-visible { outline: 3px solid var(--color-primary); outline-offset: 3px; border-radius: 4px; }
  .about-container { max-width: var(--container); margin: 0 auto; padding: 0 20px; }
  @media (min-width: 640px) { .about-container { padding: 0 32px; } }
  @media (min-width: 1280px) { .about-container { padding: 0 40px; } }
  .btn-primary { display: inline-flex; align-items: center; justify-content: center; background: var(--color-cta); color: #fff; font-family: var(--font-heading); font-weight: 700; font-size: 15px; padding: 10px 20px; border: none; border-radius: var(--radius-md); cursor: pointer; transition: background 0.2s, transform 0.2s; box-shadow: 0 4px 14px rgba(245,133,63,0.3); text-decoration: none; }
  .btn-primary:hover { background: var(--color-cta-hover); transform: translateY(-1px); }
  .btn-ghost { display: inline-flex; align-items: center; justify-content: center; background: transparent; color: var(--color-primary); font-family: var(--font-heading); font-weight: 700; font-size: 15px; padding: 10px 20px; border: 2px solid var(--color-primary); border-radius: var(--radius-md); cursor: pointer; transition: background 0.2s, color 0.2s; text-decoration: none; }
  .btn-ghost:hover { background: var(--color-primary); color: #fff; }
  .about-hero { padding: clamp(64px,8vw,112px) 0 clamp(48px,6vw,80px); position: relative; overflow: hidden; }
  .about-hero::before { content: ''; position: absolute; top: -100px; right: -200px; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle,rgba(14,124,123,0.07) 0%,transparent 70%); pointer-events: none; }
  .about-hero-inner { display: grid; grid-template-columns: 1fr; gap: 56px; align-items: start; position: relative; z-index: 1; }
  @media (min-width: 900px) { .about-hero-inner { grid-template-columns: 1fr 380px; gap: 72px; } }
  .eyebrow { font-family: var(--font-heading); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--color-primary); margin-bottom: 18px; display: block; }
  .about-hero h1 { font-size: clamp(36px,5vw,54px); font-weight: 800; color: var(--color-heading); margin-bottom: 12px; line-height: 1.08; }
  .about-tagline { font-size: 20px; color: var(--color-secondary); font-weight: 600; font-family: var(--font-heading); margin-bottom: 40px; }
  .story { font-size: 19px; line-height: 1.8; color: var(--color-body); }
  .story p { margin-bottom: 24px; }
  .story p:last-child { margin-bottom: 0; }
  .story em { font-style: italic; color: var(--color-heading); }
  .story strong { font-weight: 600; color: var(--color-heading); }
  .pull-quote { margin: 40px 0; padding: 28px 32px; border-left: 4px solid var(--color-primary); background: rgba(14,124,123,0.05); border-radius: 0 var(--radius-md) var(--radius-md) 0; }
  .pull-quote p { font-size: 20px; line-height: 1.65; color: var(--color-heading); font-style: italic; margin: 0; }
  .signature { margin-top: 40px; display: flex; align-items: center; gap: 16px; }
  .signature-line { width: 40px; height: 2px; background: var(--color-primary); }
  .signature-name { font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--color-heading); }
  .signature-title { font-size: 13px; color: var(--color-body); margin-top: 2px; }
  .about-photo-col { display: flex; flex-direction: column; gap: 24px; }
  .photo-frame { position: relative; }
  .photo-frame img { width: 100%; border-radius: var(--radius-lg); filter: grayscale(15%); box-shadow: 0 24px 64px rgba(14,124,123,0.15); transition: filter 0.4s ease; }
  .photo-frame:hover img { filter: grayscale(0%); }
  .photo-caption { font-family: var(--font-heading); font-size: 12px; color: var(--color-body); opacity: 0.55; text-align: center; margin-top: 10px; letter-spacing: 0.03em; }
  .timeline { background: #fff; border-radius: var(--radius-lg); padding: 28px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); }
  .timeline-title { font-family: var(--font-heading); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-body); opacity: 0.5; margin-bottom: 20px; }
  .timeline-item { display: flex; gap: 16px; align-items: flex-start; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid var(--color-card-bg); }
  .timeline-item:last-child { padding-bottom: 0; margin-bottom: 0; border-bottom: none; }
  .timeline-year { font-family: var(--font-heading); font-size: 12px; font-weight: 800; color: var(--color-primary); min-width: 42px; padding-top: 2px; }
  .timeline-text { font-size: 14px; line-height: 1.5; color: var(--color-body); }
  .timeline-text strong { display: block; font-family: var(--font-heading); font-size: 14px; font-weight: 700; color: var(--color-heading); margin-bottom: 2px; }
  .about-cta { padding: clamp(48px,6vw,80px) 0; text-align: center; border-top: 1px solid var(--color-border); }
  .about-cta h2 { font-size: clamp(24px,3.5vw,36px); font-weight: 800; margin-bottom: 14px; }
  .about-cta p { font-size: 18px; color: var(--color-body); max-width: 540px; margin: 0 auto 32px; line-height: 1.65; }
  .cta-buttons { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; }
  .anim { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease-out, transform 0.55s ease-out; }
  .anim.visible { opacity: 1; transform: translateY(0); }
  .anim-d1 { transition-delay: 80ms; }
  .anim-d2 { transition-delay: 160ms; }
  .anim-d3 { transition-delay: 240ms; }
`;

export default function About() {
  useEffect(() => {
    const els = document.querySelectorAll('.anim');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <Head>
        <title>About &mdash; Truvex</title>
        <meta name="description" content="Truvex was built by Ozan Atmar, a former restaurant kitchen worker and decade-long HORECA supplier who knew this problem from both sides." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://truvex.app/about" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Truvex" />
        <meta property="og:title" content="About Ozan Atmar &mdash; Truvex" />
        <meta property="og:description" content="Built by someone who lived the problem from both sides of the kitchen door." />
        <meta property="og:url" content="https://truvex.app/about" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="About &mdash; Truvex" />
        <meta name="theme-color" content="#0E7C7B" />
        <style>{ABOUT_CSS}</style>
      </Head>

      <Navbar activePage="about" />

      <main>
        <section className="about-hero">
          <div className="about-container">
            <div className="about-hero-inner">

              {/* Left: Story */}
              <div>
                <span className="eyebrow anim">The founder</span>
                <h1 className="anim anim-d1">Ozan Atmar</h1>
                <p className="about-tagline anim anim-d2">Built by someone who lived this problem from both sides of the kitchen door.</p>

                <div className="story anim anim-d3">
                  <p>
                    In the summer of 2007, I was 20 years old, working the kitchen of a busy restaurant in
                    Wisconsin Dells as part of a work &amp; travel program from my university in Istanbul.
                    I&rsquo;d started as a BBQ chef and over four months had worked my way through every station &mdash;
                    dishwashing, salads, prep, line. I liked it. I was good at it.
                  </p>

                  <div className="pull-quote">
                    <p>
                      One day, a friend needed a ride to Chicago O&rsquo;Hare. I told my manager I&rsquo;d forgotten
                      my work shoes at home and didn&rsquo;t want to ruin my good ones in the oily kitchen.
                      He had no choice. He covered my station himself &mdash; on one of the busiest days of the summer.
                    </p>
                  </div>

                  <p>
                    I got my friend to the airport. I had a great day. And then the guilt set in &mdash;
                    and honestly, it never really left. That manager deserved better than a panicked
                    scramble because one person didn&rsquo;t show up.
                  </p>

                  <p>
                    Years later, I was on the other side of that kitchen door. From 2012, I was selling
                    tableware B2B to restaurants across Bulgaria. By 2018, I&rsquo;d expanded into full
                    F&amp;B HORECA supply &mdash; everything that goes on a table or behind the bar &mdash;
                    distributing across Bulgaria and into the EU. Over more than a decade of calling on
                    restaurant managers, I heard the same complaint <em>constantly:</em>
                  </p>

                  <p>
                    <strong>&ldquo;Someone called in sick and finding coverage ruined the whole morning.&rdquo;</strong>
                  </p>

                  <p>
                    I knew exactly what that morning looked like from inside the kitchen. I also knew
                    what it cost &mdash; in stress, in understaffing, in the manager having to pick up
                    a spatula and work someone else&rsquo;s station.
                  </p>

                  <p>
                    Nobody had built a simple tool for this. Just one button. Everyone qualified gets
                    notified instantly. First available person covers. Done before the coffee gets cold.
                  </p>

                  <p>
                    I built Truvex because I owe that manager a better morning.
                  </p>

                  <div className="signature">
                    <div className="signature-line"></div>
                    <div>
                      <div className="signature-name">Ozan Atmar</div>
                      <div className="signature-title">Founder, Truvex &mdash; Varna, Bulgaria</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Photo + Timeline */}
              <div className="about-photo-col anim">
                <div className="photo-frame">
                  <img
                    src="/ozan-wisconsin-2007.jpg"
                    alt="Ozan Atmar in Wisconsin Dells, summer 2007"
                    width={600}
                    height={750}
                    loading="eager"
                  />
                  <p className="photo-caption">Wisconsin Dells, Summer 2007</p>
                </div>

                <div className="timeline">
                  <p className="timeline-title">Background</p>
                  <div className="timeline-item">
                    <span className="timeline-year">2007</span>
                    <div className="timeline-text">
                      <strong>Kitchen worker, Wisconsin Dells</strong>
                      Started as BBQ chef, worked every station over four months
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-year">2012</span>
                    <div className="timeline-text">
                      <strong>HORECA supplier, Bulgaria</strong>
                      B2B sales of tableware and glassware to restaurants
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-year">2018</span>
                    <div className="timeline-text">
                      <strong>Expanded to full F&amp;B range</strong>
                      All restaurant F&amp;B supply, distributed across Bulgaria and the EU
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-year">2026</span>
                    <div className="timeline-text">
                      <strong>Founded Truvex</strong>
                      Built the tool that should have existed all along
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="about-cta">
          <div className="about-container">
            <h2>The tool I wish existed in 2007.</h2>
            <p>
              One tap. Every qualified worker notified. Shift covered.
              Free for the first 10 workers, forever.
            </p>
            <div className="cta-buttons">
              <Link href="/#pricing" className="btn-primary">Start Free Trial</Link>
              <Link href="/" className="btn-ghost">Back to Home</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
