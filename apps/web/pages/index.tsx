import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const LANDING_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  :root {
    --color-primary:   #0E7C7B;
    --color-secondary: #E8634A;
    --color-cta:       #F5853F;
    --color-cta-hover: #E0712E;
    --color-heading:   #1A1A2E;
    --color-body:      #4A4A5A;
    --color-border:    #C4C4D0;
    --color-card-bg:   #F0F0F5;
    --color-page-bg:   #FAFAF8;
    --color-white:     #FFFFFF;
    --color-success:   #22C55E;
    --color-nav-bg:    rgba(250,250,248,0.97);
    --font-heading: 'DM Sans', sans-serif;
    --font-body:    'Lora', serif;
    --text-hero:    clamp(40px, 6vw, 64px);
    --text-h2:      clamp(28px, 4vw, 42px);
    --text-h3:      clamp(20px, 3vw, 28px);
    --text-body-lg: 20px;
    --text-body:    18px;
    --text-sm:      15px;
    --text-xs:      13px;
    --radius-sm:   6px;
    --radius-md:   12px;
    --radius-lg:   20px;
    --radius-xl:   32px;
    --section-pad: clamp(64px, 8vw, 112px);
    --container:   1200px;
  }
  body { font-family: var(--font-body); font-size: var(--text-body); color: var(--color-body); background: var(--color-page-bg); line-height: 1.6; -webkit-font-smoothing: antialiased; }
  h1,h2,h3,h4,h5,h6 { font-family: var(--font-heading); color: var(--color-heading); line-height: 1.2; }
  a { text-decoration: none; color: inherit; }
  img { max-width: 100%; height: auto; display: block; }
  button { font-family: var(--font-body); }
  :focus-visible { outline: 3px solid var(--color-primary); outline-offset: 3px; border-radius: var(--radius-sm); }
  .lp-container { max-width: var(--container); margin: 0 auto; padding: 0 20px; }
  @media (min-width: 640px) { .lp-container { padding: 0 32px; } }
  @media (min-width: 1280px) { .lp-container { padding: 0 40px; } }
  .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-cta); color: var(--color-white); font-family: var(--font-heading); font-weight: 700; font-size: 17px; padding: 16px 32px; border: none; border-radius: var(--radius-md); box-shadow: 0 4px 14px rgba(245,133,63,0.35); cursor: pointer; transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; text-decoration: none; white-space: nowrap; line-height: 1; }
  .btn-primary:hover { background: var(--color-cta-hover); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(245,133,63,0.45); }
  .btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: transparent; color: var(--color-primary); font-family: var(--font-heading); font-weight: 700; font-size: 17px; padding: 14px 30px; border: 2px solid var(--color-primary); border-radius: var(--radius-md); cursor: pointer; transition: background 0.2s ease, color 0.2s ease; text-decoration: none; white-space: nowrap; line-height: 1; }
  .btn-ghost:hover { background: var(--color-primary); color: var(--color-white); }
  .btn-ghost-dark { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: transparent; color: var(--color-heading); font-family: var(--font-heading); font-weight: 700; font-size: 17px; padding: 14px 30px; border: 2px solid var(--color-heading); border-radius: var(--radius-md); cursor: pointer; transition: background 0.2s ease, color 0.2s ease; text-decoration: none; white-space: nowrap; line-height: 1; }
  .btn-ghost-dark:hover { background: var(--color-heading); color: var(--color-white); }
  .btn-white { display: inline-flex; align-items: center; justify-content: center; background: var(--color-white); color: var(--color-primary); font-family: var(--font-heading); font-weight: 700; font-size: 17px; padding: 16px 32px; border: none; border-radius: var(--radius-md); cursor: pointer; transition: background 0.2s ease, color 0.2s ease; text-decoration: none; white-space: nowrap; line-height: 1; }
  .btn-white:hover { background: var(--color-cta); color: var(--color-white); }
  .app-badge { display: inline-flex; align-items: center; gap: 10px; background: #1a1a2e; color: var(--color-white); padding: 10px 18px; border-radius: var(--radius-md); text-decoration: none; transition: opacity 0.2s; border: 1px solid rgba(255,255,255,0.15); }
  .app-badge:hover { opacity: 0.85; }
  .app-badge svg { flex-shrink: 0; }
  .app-badge-text { display: flex; flex-direction: column; line-height: 1.2; }
  .app-badge-sub { font-family: var(--font-heading); font-size: 10px; font-weight: 400; opacity: 0.75; }
  .app-badge-name { font-family: var(--font-heading); font-size: 15px; font-weight: 700; }
  .app-badges { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .eyebrow { font-family: var(--font-heading); font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; display: block; }
  .eyebrow-teal { color: var(--color-primary); }
  .eyebrow-coral { color: var(--color-secondary); }
  .section-title { font-size: var(--text-h2); font-weight: 800; margin-bottom: 16px; }
  .section-sub { font-size: var(--text-body-lg); line-height: 1.65; max-width: 640px; }
  .hero { background: var(--color-page-bg); padding: clamp(56px,8vw,100px) 0 clamp(64px,8vw,112px); position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; top: -120px; right: -180px; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(14,124,123,0.09) 0%, transparent 70%); pointer-events: none; }
  .hero-inner { display: grid; grid-template-columns: 1fr; gap: 48px; align-items: center; position: relative; z-index: 1; }
  @media (min-width: 1024px) { .hero-inner { grid-template-columns: 1fr 1fr; gap: 64px; } }
  .hero h1 { font-size: var(--text-hero); font-weight: 800; color: var(--color-heading); line-height: 1.08; margin-bottom: 24px; }
  .hero-sub { font-size: var(--text-body-lg); color: var(--color-body); line-height: 1.65; margin-bottom: 20px; }
  .hero-social-proof { font-family: var(--font-heading); font-size: var(--text-sm); color: var(--color-primary); font-weight: 600; margin-bottom: 28px; display: flex; align-items: center; gap: 6px; }
  .hero-ctas { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 14px; }
  .hero-microcopy { font-size: var(--text-xs); color: var(--color-body); opacity: 0.65; margin-bottom: 28px; }
  .hero-image-wrap { display: flex; justify-content: center; align-items: flex-start; }
  .hero-image-wrap img { border-radius: var(--radius-xl); max-width: 440px; width: 100%; box-shadow: 0 24px 80px rgba(14,124,123,0.18); }
  @media (min-width: 1024px) { .hero-image-wrap img { max-width: 520px; } }
  .trust-bar { background: var(--color-card-bg); padding: 24px 0; }
  .trust-bar-inner { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; justify-content: center; }
  @media (min-width: 1024px) { .trust-bar-inner { justify-content: space-between; } }
  .trust-label { font-family: var(--font-heading); font-size: var(--text-xs); color: var(--color-body); opacity: 0.6; white-space: nowrap; }
  .trust-logos { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .trust-logo { font-family: var(--font-heading); font-size: 13px; font-weight: 700; color: var(--color-body); opacity: 0.4; padding: 5px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); transition: opacity 0.2s; }
  .trust-logo:hover { opacity: 0.75; }
  .trust-badges { display: flex; gap: 10px; }
  .trust-badges .app-badge { padding: 7px 12px; }
  .trust-badges .app-badge-name { font-size: 12px; }
  .feature-card { background: var(--color-white); border-radius: var(--radius-lg); padding: 32px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); transition: transform 0.22s ease, box-shadow 0.22s ease; }
  .feature-card:hover { transform: translateY(-4px); box-shadow: 0 10px 36px rgba(0,0,0,0.1); }
  .card-icon-circle { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .icon-teal { background: rgba(14,124,123,0.1); color: var(--color-primary); }
  .icon-coral { background: rgba(232,99,74,0.1); color: var(--color-secondary); }
  .card-icon-circle svg { width: 26px; height: 26px; }
  .problem { padding: var(--section-pad) 0; background: var(--color-page-bg); }
  .problem-cards { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 48px; }
  @media (min-width: 768px) { .problem-cards { grid-template-columns: repeat(3,1fr); } }
  .problem-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
  .problem-card p { font-size: var(--text-sm); line-height: 1.7; color: var(--color-body); }
  .problem-img { margin-top: 56px; border-radius: var(--radius-lg); overflow: hidden; width: 100%; }
  .problem-img img { width: 100%; }
  .how-it-works { background: var(--color-primary); padding: var(--section-pad) 0; }
  .how-it-works .section-title { text-align: center; color: var(--color-white); margin-bottom: 56px; }
  .steps { display: grid; grid-template-columns: 1fr; gap: 40px; position: relative; }
  @media (min-width: 768px) { .steps { grid-template-columns: repeat(3,1fr); gap: 32px; } }
  .step { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
  @media (min-width: 768px) { .step:not(:last-child)::after { content: ''; position: absolute; top: 28px; left: calc(100% + 0px); width: 32px; height: 0; border-top: 2px dashed rgba(255,255,255,0.35); } }
  .step-num { width: 56px; height: 56px; border-radius: 50%; background: var(--color-secondary); color: var(--color-white); font-family: var(--font-heading); font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; flex-shrink: 0; }
  .step h3 { color: var(--color-white); font-size: 20px; font-weight: 700; margin-bottom: 10px; }
  .step p { color: rgba(255,255,255,0.8); font-size: var(--text-sm); line-height: 1.7; }
  .how-cta { text-align: center; margin-top: 56px; }
  .how-cta .microcopy { color: rgba(255,255,255,0.65); font-size: var(--text-sm); margin-top: 12px; }
  .how-img { margin-top: 56px; border-radius: var(--radius-lg); overflow: hidden; width: 100%; }
  .how-img img { width: 100%; display: block; }
  .benefits { padding: var(--section-pad) 0; background: var(--color-page-bg); }
  .benefits-grid { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 48px; }
  @media (min-width: 768px) { .benefits-grid { grid-template-columns: repeat(2,1fr); } }
  .benefit-card h3 { font-size: 20px; font-weight: 700; margin: 14px 0 10px; }
  .benefit-card p { font-size: var(--text-sm); line-height: 1.7; color: var(--color-body); }
  .benefits-img { margin-top: 56px; border-radius: var(--radius-lg); overflow: hidden; width: 100%; }
  .testimonials { padding: var(--section-pad) 0; background: var(--color-page-bg); }
  .stats-bar { display: grid; grid-template-columns: repeat(3,1fr); background: var(--color-white); border-radius: var(--radius-lg); box-shadow: 0 2px 20px rgba(0,0,0,0.06); margin: 48px 0 56px; overflow: hidden; }
  .stat-item { padding: 32px 16px; text-align: center; }
  .stat-item:not(:last-child) { border-right: 1px solid var(--color-border); }
  .stat-num { font-family: var(--font-heading); font-size: clamp(32px,5vw,48px); font-weight: 800; color: var(--color-primary); display: block; line-height: 1; }
  .stat-lbl { font-size: var(--text-xs); color: var(--color-body); margin-top: 8px; line-height: 1.5; }
  .testimonial-cards { display: grid; grid-template-columns: 1fr; gap: 24px; }
  @media (min-width: 768px) { .testimonial-cards { grid-template-columns: repeat(3,1fr); } }
  .testimonial-card { background: var(--color-white); border-radius: var(--radius-lg); padding: 28px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); }
  .testimonial-card.featured { border-left: 4px solid var(--color-primary); }
  .t-stars { color: var(--color-primary); font-size: 18px; letter-spacing: 2px; margin-bottom: 14px; }
  .t-quote { font-size: var(--text-sm); line-height: 1.75; font-style: italic; color: var(--color-heading); margin-bottom: 20px; }
  .t-author { display: flex; align-items: center; gap: 12px; }
  .t-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--color-card-bg); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-size: 16px; font-weight: 800; color: var(--color-primary); }
  .t-name { font-family: var(--font-heading); font-size: var(--text-sm); font-weight: 700; color: var(--color-heading); }
  .t-role { font-size: var(--text-xs); color: var(--color-body); margin-top: 2px; }
  .app-ratings { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 48px; padding-top: 40px; border-top: 1px solid var(--color-border); align-items: center; }
  .rating-item { display: flex; align-items: center; gap: 10px; }
  .rating-store { font-family: var(--font-heading); font-size: 13px; font-weight: 700; color: var(--color-heading); }
  .rating-score { font-family: var(--font-heading); font-size: 15px; font-weight: 700; color: var(--color-primary); }
  .rating-review { font-size: var(--text-xs); color: var(--color-body); }
  .worker-section { background: rgba(14,124,123,0.055); padding: var(--section-pad) 0; }
  .worker-inner { display: grid; grid-template-columns: 1fr; gap: 48px; align-items: center; }
  @media (min-width: 1024px) { .worker-inner { grid-template-columns: 3fr 2fr; gap: 64px; } }
  .worker-intro { font-size: var(--text-body-lg); color: var(--color-body); line-height: 1.7; margin-bottom: 28px; }
  .worker-bullets { list-style: none; display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
  .worker-bullet { display: flex; align-items: flex-start; gap: 12px; font-size: var(--text-body); }
  .wbullet-icon { color: var(--color-secondary); font-size: 20px; line-height: 1.45; flex-shrink: 0; font-weight: 700; }
  .worker-ctas { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
  .worker-hint { font-size: var(--text-xs); color: var(--color-body); opacity: 0.65; }
  .worker-img img { border-radius: var(--radius-xl); width: 100%; box-shadow: 0 16px 48px rgba(232,99,74,0.15); }
  .pricing { padding: var(--section-pad) 0; background: var(--color-page-bg); }
  .pricing-hdr { text-align: center; }
  .pricing-hdr .section-sub { margin: 0 auto; text-align: center; }
  .pricing-toggle { display: flex; align-items: center; width: fit-content; margin: 24px auto 0; background: var(--color-card-bg); border-radius: 100px; padding: 4px; }
  .toggle-btn { font-family: var(--font-heading); font-size: var(--text-sm); font-weight: 600; padding: 9px 22px; border: none; border-radius: 100px; background: transparent; color: var(--color-body); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .toggle-btn.active { background: var(--color-white); color: var(--color-heading); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .pricing-cards { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 48px; max-width: 1080px; margin-left: auto; margin-right: auto; }
  @media (min-width: 768px) { .pricing-cards { grid-template-columns: repeat(3,1fr); } }
  .pricing-card { background: var(--color-white); border-radius: var(--radius-lg); padding: 32px 28px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); display: flex; flex-direction: column; border: 2px solid transparent; position: relative; overflow: visible; }
  .pricing-card.popular { border-color: var(--color-primary); }
  .popular-badge { position: absolute; top: -14px; right: 20px; background: var(--color-primary); color: var(--color-white); font-family: var(--font-heading); font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 0 0 var(--radius-sm) var(--radius-sm); text-transform: uppercase; letter-spacing: 0.05em; }
  .plan-name { font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: var(--color-heading); margin-bottom: 8px; }
  .plan-price { font-family: var(--font-heading); font-size: clamp(32px,4vw,40px); font-weight: 800; color: var(--color-heading); line-height: 1; margin: 4px 0; }
  .plan-price-note { font-size: var(--text-xs); color: var(--color-body); min-height: 18px; margin-bottom: 4px; }
  .plan-tagline { font-size: var(--text-sm); color: var(--color-body); margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
  .plan-features { list-style: none; display: flex; flex-direction: column; gap: 11px; flex: 1; margin-bottom: 28px; }
  .pf { display: flex; align-items: center; gap: 10px; font-size: var(--text-sm); }
  .pf.yes { color: var(--color-heading); }
  .pf.no { color: var(--color-body); opacity: 0.45; }
  .pf-icon { font-size: 15px; flex-shrink: 0; }
  .pf.yes .pf-icon { color: var(--color-success); }
  .pf.no .pf-icon { color: var(--color-border); }
  .plan-cta { width: 100%; text-align: center; }
  .plan-microcopy { font-size: var(--text-xs); color: var(--color-body); opacity: 0.6; text-align: center; margin-top: 8px; }
  .pricing-footer { text-align: center; margin-top: 36px; font-size: var(--text-sm); color: var(--color-body); }
  .pricing-footer a { color: var(--color-primary); text-decoration: underline; }
  .pricing-mini-faq { max-width: 620px; margin: 40px auto 0; }
  .mfq { margin-bottom: 18px; }
  .mfq-q { font-family: var(--font-heading); font-weight: 700; font-size: var(--text-sm); color: var(--color-heading); margin-bottom: 4px; }
  .mfq-a { font-size: var(--text-sm); color: var(--color-body); line-height: 1.6; }
  .cta-break { background: linear-gradient(135deg,#0E7C7B 0%,#0A5F5E 100%); padding: var(--section-pad) 0; text-align: center; position: relative; overflow: hidden; }
  .cta-break::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle,rgba(255,255,255,0.15) 1px,transparent 1px); background-size: 20px 20px; pointer-events: none; z-index: 0; }
  .cta-break-inner { position: relative; z-index: 1; max-width: 680px; margin: 0 auto; }
  .cta-break h2 { color: var(--color-white); font-size: var(--text-h2); font-weight: 800; margin-bottom: 16px; }
  .cta-break-sub { color: rgba(255,255,255,0.85); font-size: var(--text-body-lg); margin-bottom: 36px; line-height: 1.65; }
  .cta-break-micro { color: rgba(255,255,255,0.6); font-size: var(--text-sm); margin-top: 14px; }
  .faq { padding: var(--section-pad) 0; background: var(--color-card-bg); }
  .faq .section-title { margin-bottom: 0; text-align: center; }
  .faq-list { max-width: 740px; margin: 44px auto 0; }
  .faq-item { background: var(--color-white); border-radius: var(--radius-md); margin-bottom: 10px; }
  .faq-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 20px 22px; background: none; border: none; cursor: pointer; text-align: left; font-family: var(--font-heading); font-size: var(--text-body); font-weight: 700; color: var(--color-heading); gap: 12px; }
  .faq-chevron { flex-shrink: 0; transition: transform 0.3s ease; color: var(--color-primary); }
  .faq-item.open .faq-chevron { transform: rotate(90deg); }
  .faq-panel { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; padding: 0 22px; }
  .faq-item.open .faq-panel { max-height: 400px; padding-bottom: 20px; }
  .faq-panel p { font-size: var(--text-sm); color: var(--color-body); line-height: 1.75; }
  .faq-footer { text-align: center; margin-top: 44px; font-size: var(--text-body); color: var(--color-body); }
  .faq-footer a { color: var(--color-primary); font-family: var(--font-heading); font-weight: 700; text-decoration: underline; }
  .final-cta { padding: var(--section-pad) 0; background: var(--color-page-bg); text-align: center; position: relative; overflow: hidden; }
  .final-cta::before { content: ''; position: absolute; bottom: -240px; left: 50%; transform: translateX(-50%); width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle,rgba(14,124,123,0.07) 0%,transparent 70%); pointer-events: none; }
  .final-cta-inner { position: relative; z-index: 1; max-width: 680px; margin: 0 auto; }
  .final-cta h2 { font-size: clamp(48px,7vw,72px); font-weight: 800; margin-bottom: 14px; }
  .final-cta-body { font-size: var(--text-body-lg); color: var(--color-body); margin-bottom: 36px; line-height: 1.65; }
  .final-cta .btn-primary { padding: 20px 48px; font-size: 18px; }
  .final-cta-micro { font-size: var(--text-xs); color: var(--color-body); opacity: 0.55; margin-top: 14px; }
  .download-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 16px; margin-top: 36px; }
  .download-or { font-family: var(--font-heading); font-size: var(--text-sm); color: var(--color-body); opacity: 0.45; }
  .qr-block { background: var(--color-white); border-radius: var(--radius-md); padding: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
  .qr-caption { font-family: var(--font-heading); font-size: 11px; color: var(--color-body); margin-top: 8px; opacity: 0.65; }
  .mobile-cta-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 200; background: var(--color-white); box-shadow: 0 -2px 16px rgba(0,0,0,0.12); padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom,0px)); transform: translateY(100%); transition: transform 0.3s ease; }
  .mobile-cta-bar.visible { transform: translateY(0); }
  @media (min-width: 1024px) { .mobile-cta-bar { display: none !important; } }
  .mobile-cta-bar .btn-primary { width: 100%; justify-content: center; }
  .mobile-cta-micro { font-size: 11px; color: var(--color-body); opacity: 0.55; text-align: center; margin-top: 5px; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.52); z-index: 400; display: none; align-items: center; justify-content: center; padding: 20px; }
  .modal-overlay.open { display: flex; }
  .modal { background: var(--color-white); border-radius: var(--radius-lg); padding: 36px; max-width: 460px; width: 100%; position: relative; }
  .modal-close { position: absolute; top: 14px; right: 16px; background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-body); line-height: 1; padding: 4px; border-radius: var(--radius-sm); }
  .modal h3 { font-size: 20px; font-weight: 800; margin-bottom: 10px; }
  .modal-desc { font-size: var(--text-sm); color: var(--color-body); margin-bottom: 16px; }
  .modal-message { font-size: var(--text-sm); color: var(--color-body); background: var(--color-card-bg); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; line-height: 1.7; font-style: italic; border-left: 3px solid var(--color-secondary); }
  .modal-actions { display: flex; flex-direction: column; gap: 10px; }
  .modal .btn-primary { width: 100%; justify-content: center; }
  .btn-copy { width: 100%; background: none; border: 2px solid var(--color-border); color: var(--color-body); font-family: var(--font-heading); font-weight: 600; font-size: 15px; padding: 12px; border-radius: var(--radius-md); cursor: pointer; transition: border-color 0.2s, color 0.2s; }
  .btn-copy:hover { border-color: var(--color-primary); color: var(--color-primary); }
  .btn-copy.copied { border-color: var(--color-success); color: var(--color-success); }
  .anim { opacity: 0; transform: translateY(24px); will-change: transform,opacity; transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
  .anim.visible { opacity: 1; transform: translateY(0); }
  .anim-d1 { transition-delay: 100ms; }
  .anim-d2 { transition-delay: 200ms; }
  .anim-d3 { transition-delay: 300ms; }
  .anim-d4 { transition-delay: 400ms; }
`;

const FAQ_ITEMS = [
  { q: 'How does Truvex work?', a: 'When a team member calls in sick, you tap one button. Every qualified off-duty worker instantly gets notified via push notification and SMS. Workers who are available tap Accept. You review who responded, pick your coverage, and confirm. The whole process takes under 60 seconds.' },
  { q: 'Do I need a credit card to start?', a: 'No. Your 14-day free trial is completely free \u2014 no credit card, no commitment. After the trial, continue on the free Starter plan or upgrade to Pro or Business.' },
  { q: 'What is the difference between the free plan and the free trial?', a: 'The free Starter plan lets teams of up to 10 use Truvex forever \u2014 no expiration. The 14-day trial gives you full Pro or Business access so you can experience everything before deciding.' },
  { q: "What if my workers don\u2019t download the app?", a: "Workers don\u2019t need the app to receive shift alerts \u2014 they get a text message with a link to accept. Most workers download the app within the first week because it lets them see and claim open shifts proactively." },
  { q: 'Does Truvex replace my scheduling tool?', a: 'No. Truvex complements your existing schedule. It is not a scheduler \u2014 it is the emergency button when your schedule falls apart. Set up your team roster in minutes and you are ready.' },
  { q: 'How long does setup take?', a: 'Most managers are fully set up in under 15 minutes. Download the app, add your team (they receive an SMS invite), and you are ready for your next callout.' },
  { q: 'Is Truvex only for restaurants?', a: 'Restaurants are our primary focus, but Truvex works for any shift-based workplace \u2014 bars, retail, hotels, healthcare, and more.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. No contracts, no cancellation fees. Cancel from the app anytime and downgrade to the free Starter plan whenever you want.' },
  { q: 'Can I manage multiple locations?', a: 'Yes. Each account includes one free location. Additional locations require a paid plan (Pro or Business) \u2014 each location is billed separately.' },
];

export default function Home() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const els = document.querySelectorAll('.anim');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const bar = document.querySelector('.stats-bar');
    if (!bar) return;
    let counted = false;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !counted) {
          counted = true;
          document.querySelectorAll<HTMLElement>('.stat-num[data-target]').forEach((el) => {
            const target = parseInt(el.getAttribute('data-target') || '0', 10);
            const suffix = el.getAttribute('data-suffix') || '';
            let startTime: number | null = null;
            const duration = 1400;
            function step(ts: number) {
              if (!startTime) startTime = ts;
              const progress = Math.min((ts - startTime) / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 3);
              el.textContent = Math.floor(ease * target) + suffix;
              if (progress < 1) requestAnimationFrame(step);
              else el.textContent = target + suffix;
            }
            requestAnimationFrame(step);
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.5 });
    obs.observe(bar);
    return () => obs.disconnect();
  }, []);

  function toggleFaq(i: number) {
    setOpenFaq((prev) => (prev === i ? null : i));
  }

  return (
    <>
      <Head>
        <title>Truvex &mdash; One-Tap Shift Coverage App for Restaurants</title>
        <meta name="description" content="Employee called out? Tap one button &mdash; all qualified off-duty workers get notified via push + SMS. Multiple workers accept, you pick who covers. Free for restaurant teams. 14-day free trial." />
        <meta name="keywords" content="shift coverage app, employee callout app, restaurant shift replacement, automated shift callout, last minute shift fill" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Truvex" />
        <link rel="canonical" href="https://truvex.app/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Truvex" />
        <meta property="og:title" content="Truvex &mdash; One-Tap Shift Coverage App for Restaurants" />
        <meta property="og:description" content="Stop the 6 AM phone scramble. One tap notifies every qualified worker via push + SMS. Shift covered in under 60 seconds. Free 14-day trial." />
        <meta property="og:image" content="https://truvex.app/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://truvex.app/" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@truvexapp" />
        <meta name="twitter:title" content="Truvex &mdash; One-Tap Shift Coverage App for Restaurants" />
        <meta name="twitter:description" content="Stop the 6 AM phone scramble. One tap notifies every qualified worker via push + SMS. Shift covered in under 60 seconds." />
        <meta name="twitter:image" content="https://truvex.app/og-image.jpg" />
        <meta name="theme-color" content="#0E7C7B" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Truvex","applicationCategory":"BusinessApplication","operatingSystem":"iOS, Android","description":"One-tap shift coverage app for restaurants.","url":"https://truvex.app","offers":[{"@type":"Offer","name":"Starter","price":"0","priceCurrency":"USD"},{"@type":"Offer","name":"Pro","price":"49","priceCurrency":"USD"},{"@type":"Offer","name":"Business","price":"99","priceCurrency":"USD"}],"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","ratingCount":"124"}}` }} />
        <style>{LANDING_CSS}</style>
      </Head>

      <Navbar activePage="home" heroSectionId="hero" />

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="lp-container">
          <div className="hero-inner">
            <div className="hero-text">
              <span className="eyebrow eyebrow-teal">Shift Coverage App for Restaurants</span>
              <h1>Stop Scrambling When<br />Someone Calls In Sick</h1>
              <p className="hero-sub">One tap notifies every qualified worker via push and SMS. Multiple workers accept. You pick who covers. Done before your coffee gets cold.</p>
              <p className="hero-social-proof">
                <span style={{ color: '#F5853F', letterSpacing: 1 }}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                Trusted by 500+ restaurant managers
              </p>
              <div className="hero-ctas">
                <a href="#how-it-works" className="btn-ghost">See How It Works &darr;</a>
              </div>
            </div>
            <div className="hero-image-wrap">
              <img src="/hero-manager-phone.jpg" alt="Restaurant manager using Truvex app to fill shift coverage on phone" width={600} height={700} loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="lp-container">
          <div className="trust-bar-inner">
            <span className="trust-label">Works alongside the tools you already use:</span>
            <div className="trust-logos">
              {['Toast', 'Square', '7shifts', 'Deputy', 'Homebase'].map((t) => (
                <span key={t} className="trust-logo">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="problem">
        <div className="lp-container">
          <div className="anim"><h2 className="section-title">The 6 AM Phone Scramble Is Costing You</h2></div>
          <div className="problem-cards">
            <div className="feature-card problem-card anim anim-d1">
              <div className="card-icon-circle icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.02 2.02 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91" /><line x1="17" y1="7" x2="23" y2="13" /><line x1="23" y1="7" x2="17" y2="13" /></svg>
              </div>
              <h3>The phone tree from hell</h3>
              <p>Someone calls out at 6 AM. You start dialing. First person: no answer. Second: can&rsquo;t make it. Third: no response. Twelve calls later, you&rsquo;re still short.</p>
            </div>
            <div className="feature-card problem-card anim anim-d2">
              <div className="card-icon-circle icon-coral">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /><line x1="4" y1="20" x2="8" y2="16" /></svg>
              </div>
              <h3>Hours lost before service even starts</h3>
              <p>Restaurant managers lose 3+ hours per week to manual callout coverage. That time should go to running your restaurant, not chasing callbacks.</p>
            </div>
            <div className="feature-card problem-card anim anim-d3">
              <div className="card-icon-circle icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="23" y1="9" x2="17" y2="9" /></svg>
              </div>
              <h3>Understaffed nights hurt everyone</h3>
              <p>Slow service. Long waits. Stressed team. One missed shift cascades into a bad night for your staff, your guests, and your reviews.</p>
            </div>
          </div>
          <div className="problem-img anim">
            <img src="/problem-illustration.jpg" alt="Illustration showing the frustration of manual shift callout phone chains" width={1200} height={400} loading="lazy" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how-it-works">
        <div className="lp-container">
          <h2 className="section-title anim">Three taps. Shift covered. Coffee&rsquo;s still hot.</h2>
          <div className="steps">
            <div className="step anim anim-d1">
              <div className="step-num">1</div>
              <h3>Someone calls out</h3>
              <p>A team member can&rsquo;t make their shift. Open Truvex, tap &ldquo;Find Coverage.&rdquo; Takes 5 seconds.</p>
            </div>
            <div className="step anim anim-d2">
              <div className="step-num">2</div>
              <h3>Everyone gets notified</h3>
              <p>Every qualified off-duty worker instantly gets a push notification and SMS. No group texts. No phone calls. No chasing.</p>
            </div>
            <div className="step anim anim-d3">
              <div className="step-num">3</div>
              <h3>You pick your coverage</h3>
              <p>See who accepted. Pick your person. Confirm. If you don&rsquo;t act within 30 minutes, the first acceptor is assigned automatically.</p>
            </div>
          </div>
          <div className="how-img anim">
            <img src="/how-it-works-flow.jpg" alt="Three-step process showing how Truvex automates shift callout coverage" width={1000} height={360} loading="lazy" />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="benefits">
        <div className="lp-container">
          <div className="anim"><h2 className="section-title">What changes when you stop scrambling</h2></div>
          <div className="benefits-grid">
            <div className="feature-card benefit-card anim anim-d1">
              <div className="card-icon-circle icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
              </div>
              <h3>Get your mornings back</h3>
              <p>No more 6 AM phone trees. Truvex handles the callout blast in seconds so you can focus on opening the restaurant.</p>
            </div>
            <div className="feature-card benefit-card anim anim-d2">
              <div className="card-icon-circle icon-coral">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
              </div>
              <h3>Never run understaffed again</h3>
              <p>Every qualified worker gets notified instantly. More eyes on the open shift means faster coverage &mdash; every time.</p>
            </div>
            <div className="feature-card benefit-card anim anim-d3">
              <div className="card-icon-circle icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
              </div>
              <h3>Your team actually wants this</h3>
              <p>Workers pick up extra hours on their terms. No more awkward group text pressure. They accept, you confirm. Everyone wins.</p>
            </div>
            <div className="feature-card benefit-card anim anim-d4">
              <div className="card-icon-circle icon-coral">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
              </div>
              <h3>Works with your existing setup</h3>
              <p>Truvex is not a scheduler. It is the emergency button when your schedule falls apart. Setup takes 15 minutes. No training required.</p>
            </div>
          </div>
          <div className="benefits-img anim">
            <img src="/manager-lifestyle.jpg" alt="Restaurant shift manager calmly using Truvex to fill an open shift" width={1200} height={500} loading="lazy" />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="lp-container">
          <div className="anim"><h2 className="section-title">Managers who stopped scrambling</h2></div>
          <div className="stats-bar anim">
            <div className="stat-item">
              <span className="stat-num" data-target="500" data-suffix="+">0</span>
              <p className="stat-lbl">Shifts<br />covered</p>
            </div>
            <div className="stat-item">
              <span className="stat-num" data-target="12" data-suffix=" min">0</span>
              <p className="stat-lbl">Avg. time to<br />fill a shift</p>
            </div>
            <div className="stat-item">
              <span className="stat-num" data-target="3" data-suffix=" hrs">0</span>
              <p className="stat-lbl">Saved per<br />manager/week</p>
            </div>
          </div>
          <div className="testimonial-cards">
            <div className="testimonial-card featured anim anim-d1">
              <div className="t-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p className="t-quote">&ldquo;I used to spend 45 minutes every morning making calls. Now it takes me 30 seconds. I don&rsquo;t know how I managed without it.&rdquo;</p>
              <div className="t-author">
                <div className="t-avatar">S</div>
                <div><p className="t-name">Sarah M.</p><p className="t-role">General Manager &middot; The Grille House, Austin TX</p></div>
              </div>
            </div>
            <div className="testimonial-card anim anim-d2">
              <div className="t-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p className="t-quote">&ldquo;My staff actually responds faster to Truvex than they ever did to my group texts. Everyone&rsquo;s on it.&rdquo;</p>
              <div className="t-author">
                <div className="t-avatar">M</div>
                <div><p className="t-name">Marcus D.</p><p className="t-role">Shift Manager &middot; Pacific Coastal Kitchen</p></div>
              </div>
            </div>
            <div className="testimonial-card anim anim-d3">
              <div className="t-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p className="t-quote">&ldquo;Set it up in 10 minutes on a Sunday night. By Tuesday morning I&rsquo;d already used it twice. Worth every penny.&rdquo;</p>
              <div className="t-author">
                <div className="t-avatar">P</div>
                <div><p className="t-name">Priya K.</p><p className="t-role">Restaurant Owner &middot; Spice Route Bistro</p></div>
              </div>
            </div>
          </div>
          <div className="app-ratings anim">
            <div className="rating-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#1a1a2e"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" /></svg>
              <div><p className="rating-store">Apple App Store</p><p className="rating-score">4.8 &#9733; &nbsp;<span className="rating-review">&ldquo;Shift Saver&rdquo; &mdash; Jan 2025</span></p></div>
            </div>
            <div className="rating-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3.18 23.22c.3.17.63.25.97.25.3 0 .6-.07.88-.2l13.1-7.22-2.8-2.8-12.15 9.97zM1.07 1.57C1.03 1.78 1 2 1 2.22v19.56c0 .22.03.44.07.64L13 11 1.07 1.57zM20.45 10.25l-2.96-1.63-3.14 3.14 3.14 3.14 2.98-1.64c.84-.47.84-1.54-.02-2.01zM4.15.73L17.25 7.95l-2.8 2.8L3.15.98c.3-.13.62-.19.95-.19.36 0 .7.07 1.05.2z" fill="#1a1a2e" /></svg>
              <div><p className="rating-store">Google Play</p><p className="rating-score">4.7 &#9733; &nbsp;<span className="rating-review">&ldquo;Finally, no more calling everyone&rdquo; &mdash; Feb 2025</span></p></div>
            </div>
          </div>
        </div>
      </section>

      {/* WORKER SECTION */}
      <section className="worker-section">
        <div className="lp-container">
          <div className="worker-inner">
            <div className="worker-text anim">
              <span className="eyebrow eyebrow-coral">For Restaurant Workers</span>
              <h2 className="section-title">Workers: want to grab extra shifts?</h2>
              <p className="worker-intro">Truvex isn&rsquo;t just for managers. When your restaurant uses Truvex, every open shift hits your phone the moment it&rsquo;s posted &mdash; before the group chat even starts.</p>
              <ul className="worker-bullets">
                <li className="worker-bullet"><span className="wbullet-icon">&#10003;</span><span><strong>Get notified first</strong> &mdash; Push + text when a shift you qualify for opens up</span></li>
                <li className="worker-bullet"><span className="wbullet-icon">&#10003;</span><span><strong>Accept with one tap</strong> &mdash; See the details, tap accept, you&rsquo;re done</span></li>
                <li className="worker-bullet"><span className="wbullet-icon">&#10003;</span><span><strong>Earn more on your terms</strong> &mdash; Turn notifications on or off anytime from settings</span></li>
              </ul>
            </div>
            <div className="worker-img anim anim-d2">
              <img src="/worker-notification.jpg" alt="Restaurant worker receiving an open shift notification on their phone via Truvex" width={480} height={560} loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="lp-container">
          <div className="pricing-hdr anim">
            <h2 className="section-title">Simple pricing. No surprises.</h2>
            <p className="section-sub">Every paid plan starts with a 14-day free trial. No credit card required.</p>
            <div className="pricing-toggle" role="group" aria-label="Billing period">
              <button className={`toggle-btn${!isAnnual ? ' active' : ''}`} onClick={() => setIsAnnual(false)} aria-pressed={!isAnnual}>Monthly</button>
              <button className={`toggle-btn${isAnnual ? ' active' : ''}`} onClick={() => setIsAnnual(true)} aria-pressed={isAnnual}>Annual &mdash; Save 20%</button>
            </div>
          </div>
          <div className="pricing-cards">
            {/* Starter */}
            <div className="pricing-card anim anim-d1">
              <p className="plan-name">Starter</p>
              <p className="plan-price">Free</p>
              <p className="plan-price-note">forever</p>
              <p className="plan-tagline">For small teams getting started</p>
              <ul className="plan-features">
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Up to 10 workers</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Post unlimited callouts</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> In-app notifications</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Share callout link via WhatsApp/text</li>
                <li className="pf no"><span className="pf-icon">&#10007;</span> Push notifications</li>
                <li className="pf no"><span className="pf-icon">&#10007;</span> SMS alerts</li>
                <li className="pf no"><span className="pf-icon">&#10007;</span> Analytics</li>
              </ul>
            </div>
            {/* Pro */}
            <div className="pricing-card popular anim anim-d2">
              <span className="popular-badge">Most Popular</span>
              <p className="plan-name">Pro</p>
              <p className="plan-price">{isAnnual ? '$39' : '$49'}<span style={{ fontSize: 18, fontWeight: 600 }}>/mo</span></p>
              <p className="plan-price-note" style={{ display: isAnnual ? 'block' : 'none' }}>billed $468/yr</p>
              <p className="plan-price-note" style={{ display: isAnnual ? 'none' : 'block' }}>&nbsp;</p>
              <p className="plan-tagline">For busy restaurants that can&rsquo;t afford gaps</p>
              <ul className="plan-features">
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Up to 30 workers</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Post unlimited callouts</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Push + SMS notifications</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Manager dashboard</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Callout history log</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Worker mute controls</li>
                <li className="pf no"><span className="pf-icon">&#10007;</span> Advanced analytics</li>
              </ul>
            </div>
            {/* Business */}
            <div className="pricing-card anim anim-d3">
              <p className="plan-name">Business</p>
              <p className="plan-price">{isAnnual ? '$79' : '$99'}<span style={{ fontSize: 18, fontWeight: 600 }}>/mo</span></p>
              <p className="plan-price-note" style={{ display: isAnnual ? 'block' : 'none' }}>billed $948/yr</p>
              <p className="plan-price-note" style={{ display: isAnnual ? 'none' : 'block' }}>&nbsp;</p>
              <p className="plan-tagline">For high-volume teams with large workforces</p>
              <ul className="plan-features">
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Unlimited workers</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Post unlimited callouts</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Push + SMS notifications</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Advanced analytics</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Priority support</li>
                <li className="pf yes"><span className="pf-icon">&#10003;</span> Everything in Pro</li>
              </ul>
            </div>
          </div>
          <p className="pricing-footer anim">Workers are always free &mdash; no charge per worker &nbsp;&bull;&nbsp; Questions? Email <a href="mailto:hello@truvex.app">hello@truvex.app</a></p>
          <div className="pricing-mini-faq anim">
            <div className="mfq"><p className="mfq-q">Can I switch plans anytime?</p><p className="mfq-a">Yes. Upgrade, downgrade, or cancel any time from the app. No penalties.</p></div>
            <div className="mfq"><p className="mfq-q">What happens after my 14-day trial?</p><p className="mfq-a">You automatically move to the free Starter plan. No charges unless you choose to upgrade.</p></div>
            <div className="mfq"><p className="mfq-q">Is there a long-term contract?</p><p className="mfq-a">No. Month to month. Cancel whenever you want.</p></div>
          </div>
        </div>
      </section>

      {/* CTA BREAK */}
      <section className="cta-break">
        <div className="lp-container">
          <div className="cta-break-inner anim">
            <h2>Ready to stop the 6 AM scramble?</h2>
            <p className="cta-break-sub">We&rsquo;re launching soon. Truvex gives restaurant managers one-tap coverage when someone calls in sick.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="lp-container">
          <div className="anim"><h2 className="section-title">Questions? We&rsquo;ve got answers.</h2></div>
          <div className="faq-list" role="list">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`} role="listitem">
                <button
                  className="faq-btn"
                  aria-expanded={openFaq === i}
                  id={`faq-q-${i + 1}`}
                  aria-controls={`faq-a-${i + 1}`}
                  onClick={() => toggleFaq(i)}
                >
                  {item.q}
                  <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <div className="faq-panel" id={`faq-a-${i + 1}`} role="region" aria-labelledby={`faq-q-${i + 1}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="faq-footer anim">Still have questions? We&rsquo;re real people. &nbsp;<a href="mailto:hello@truvex.app">Email us at hello@truvex.app</a></p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="lp-container">
          <div className="final-cta-inner anim">
            <span className="eyebrow eyebrow-coral">Your Next Callout Is Coming</span>
            <h2>Be ready.</h2>
            <p className="final-cta-body">We&rsquo;re putting the finishing touches on Truvex.<br />Questions? <a href="mailto:hello@truvex.app" style={{ color: '#0E7C7B', textDecoration: 'underline' }}>hello@truvex.app</a></p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
