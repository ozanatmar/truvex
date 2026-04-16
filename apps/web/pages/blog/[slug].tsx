import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APP_STRIP_HTML = `
<div style="margin: 40px 0; padding: 24px 28px; background: #f0f7f7; border-radius: 14px; border-left: 4px solid #0E7C7B;">
  <p style="font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0E7C7B; margin: 0 0 8px;">Truvex App</p>
  <p style="font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 600; color: #1A1A2E; margin: 0 0 16px; line-height: 1.4;">One tap to fill a last-minute callout. Free for teams up to 10.</p>
  <div style="display: flex; gap: 12px; flex-wrap: wrap;">
    <a href="https://truvex.app/#download" style="display: inline-flex; align-items: center; gap: 8px; background: #1A1A2E; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px; text-decoration: none;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      App Store
    </a>
    <a href="https://truvex.app/#download" style="display: inline-flex; align-items: center; gap: 8px; background: #1A1A2E; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 8px; text-decoration: none;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.3.17.64.22.98.15l12.08-6.98-2.61-2.61-10.45 9.44zm-1.81-20.1c-.05.17-.07.35-.07.54v15.6c0 .19.02.38.08.55l.06.06 8.74-8.74v-.2L1.31 3.6l.06.06zM20.12 10.1l-2.5-1.45-2.93 2.93 2.93 2.93 2.52-1.45c.72-.41.72-1.55-.02-1.96zM4.17.42L16.25 7.4l-2.62 2.62L3.18.59A1.17 1.17 0 014.17.42z"/></svg>
      Google Play
    </a>
  </div>
</div>
`;

function injectAppStrip(html: string, stripHtml: string): string {
  // Try to insert after the last <h2>...</h2> block
  const h2Regex = /(<\/h2>)/gi;
  const h2Matches = Array.from(html.matchAll(h2Regex));
  if (h2Matches.length > 0) {
    const lastMatch = h2Matches[h2Matches.length - 1];
    const insertAt = lastMatch.index! + lastMatch[0].length;
    return html.slice(0, insertAt) + stripHtml + html.slice(insertAt);
  }

  // Fallback: insert after second-to-last </p>
  const pRegex = /(<\/p>)/gi;
  const pMatches = Array.from(html.matchAll(pRegex));
  if (pMatches.length >= 2) {
    const target = pMatches[pMatches.length - 2];
    const insertAt = target.index! + target[0].length;
    return html.slice(0, insertAt) + stripHtml + html.slice(insertAt);
  }

  // Last resort: append
  return html + stripHtml;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  body_html: string;
  published_at: string;
}

interface Props {
  post: BlogPost;
}

export default function BlogPostPage({ post }: Props) {
  const publishedDate = new Date(post.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const enrichedHtml = injectAppStrip(post.body_html, APP_STRIP_HTML);

  return (
    <>
      <Head>
        <title>{post.title} — Truvex Blog</title>
        <meta
          name="description"
          content={post.description ?? `${post.title} — Truvex Blog`}
        />
        <meta property="og:title" content={post.title} />
        <meta
          property="og:description"
          content={post.description ?? post.title}
        />
        <meta property="og:type" content="article" />
        <meta
          property="og:url"
          content={`https://truvex.app/blog/${post.slug}`}
        />
        <meta property="og:site_name" content="Truvex" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={post.title} />
        <link
          rel="canonical"
          href={`https://truvex.app/blog/${post.slug}`}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
        <style>{`body { background: #FAFAF8; }`}</style>
      </Head>

      <div style={styles.page}>
        {/* NAV */}
        <nav style={styles.nav}>
          <div style={styles.navInner}>
            <Link href="/" style={styles.navLogo}>Truvex</Link>
            <Link href="/blog" style={styles.navBack}>← All posts</Link>
          </div>
        </nav>

        {/* ARTICLE */}
        <main style={styles.main}>
          <article style={styles.article}>
            <header style={styles.header}>
              <p style={styles.date}>{publishedDate}</p>
              <h1 style={styles.title}>{post.title}</h1>
              {post.description && (
                <p style={styles.description}>{post.description}</p>
              )}
            </header>

            <div
              className="blog-body"
              style={styles.body}
              dangerouslySetInnerHTML={{ __html: enrichedHtml }}
            />

            <footer style={styles.footer}>
              <div style={styles.cta}>
                <p style={styles.ctaText}>
                  Truvex was built for this exact problem. Free for teams up to 10 workers, no credit card required.
                </p>
                <Link href="/#pricing" style={styles.ctaButton}>
                  Start Free — No Credit Card
                </Link>
              </div>
            </footer>
          </article>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { slug } = ctx.params as { slug: string };

  const { data, error } = await supabase
    .schema('truvex')
    .from('blog_posts')
    .select('id, title, slug, description, body_html, published_at')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return { notFound: true };
  }

  return { props: { post: data } };
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#FAFAF8',
    fontFamily: "'Lora', Georgia, serif",
  },
  nav: {
    position: 'sticky',
    top: 0,
    background: 'rgba(250,250,248,0.97)',
    borderBottom: '1px solid #e8e8ec',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
  },
  navInner: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '0 24px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLogo: {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 800,
    fontSize: 20,
    color: '#0E7C7B',
    textDecoration: 'none',
  },
  navBack: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: '#4A4A5A',
    textDecoration: 'none',
  },
  main: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  article: {},
  header: {
    marginBottom: 40,
    paddingBottom: 32,
    borderBottom: '1px solid #e8e8ec',
  },
  date: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: '#8A8A9A',
    marginBottom: 12,
    margin: '0 0 12px',
  },
  title: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 'clamp(26px, 4vw, 38px)',
    fontWeight: 800,
    color: '#1A1A2E',
    lineHeight: 1.15,
    margin: '0 0 16px',
  },
  description: {
    fontSize: 18,
    color: '#4A4A5A',
    lineHeight: 1.6,
    margin: '16px 0 0',
    fontStyle: 'italic',
  },
  body: {
    fontSize: 18,
    lineHeight: 1.8,
    color: '#2A2A3A',
  },
  footer: {
    marginTop: 64,
    paddingTop: 40,
    borderTop: '1px solid #e8e8ec',
  },
  cta: {
    background: '#0E7C7B',
    borderRadius: 16,
    padding: '32px',
    textAlign: 'center',
  },
  ctaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 17,
    lineHeight: 1.6,
    margin: '0 0 20px',
    fontFamily: "'DM Sans', sans-serif",
  },
  ctaButton: {
    display: 'inline-block',
    background: '#F5853F',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    padding: '12px 28px',
    borderRadius: 10,
    textDecoration: 'none',
  },
};
