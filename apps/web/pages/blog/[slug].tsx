import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import BlogLayout from '../../components/BlogLayout';
import { optimizedImageUrl } from '../../lib/image';

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

function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveDescription(post: Pick<BlogPost, 'description' | 'body_html' | 'title'>): string {
  if (post.description && post.description.trim().length > 0) return post.description;
  const text = stripHtmlToText(post.body_html);
  if (text.length === 0) return post.title;
  if (text.length <= 155) return text;
  return text.slice(0, 152).replace(/\s+\S*$/, '') + '...';
}

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

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'section';
}

// Walks every <h2>...</h2>, adds an id attribute (slug of the heading text),
// and returns both the rewritten html and a list of {id, text} entries for
// the TOC. Existing ids on h2s are preserved. Ensures uniqueness by
// suffixing -2, -3, etc. when the same slug appears twice.
function injectH2IdsAndCollect(html: string): { html: string; toc: Array<{ id: string; text: string }> } {
  const seen = new Map<string, number>();
  const toc: Array<{ id: string; text: string }> = [];
  const h2Re = /<h2([^>]*)>([\s\S]*?)<\/h2>/gi;
  const rewritten = html.replace(h2Re, (_match, attrs, inner) => {
    const textOnly = String(inner).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const existingIdMatch = String(attrs).match(/\sid\s*=\s*"([^"]+)"/i);
    let id: string;
    if (existingIdMatch) {
      id = existingIdMatch[1];
    } else {
      const base = slugifyHeading(textOnly);
      const n = seen.get(base) ?? 0;
      id = n === 0 ? base : `${base}-${n + 1}`;
      seen.set(base, n + 1);
    }
    toc.push({ id, text: textOnly });
    const newAttrs = existingIdMatch ? attrs : ` id="${id}"${attrs}`;
    return `<h2${newAttrs}>${inner}</h2>`;
  });
  return { html: rewritten, toc };
}

function truncateTitle(title: string, max: number): string {
  if (title.length <= max) return title;
  const cut = title.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '\u2026';
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  body_html: string;
  published_at: string;
  updated_at: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  schema_type: string | null;
  schema_data: Record<string, unknown> | null;
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

  const { html: htmlWithIds, toc } = injectH2IdsAndCollect(post.body_html);
  const enrichedHtml = injectAppStrip(htmlWithIds, APP_STRIP_HTML);
  const url = `https://truvex.app/blog/${post.slug}`;
  const description = deriveDescription(post);
  const heroAlt = post.hero_image_alt && post.hero_image_alt.trim().length > 0
    ? post.hero_image_alt
    : post.title;
  // Twitter + Facebook want roughly 1200x630. Hero is stored at 1536x1024 so
  // resize on-the-fly via Supabase transforms and fall back to the static OG.
  const ogImage = optimizedImageUrl(post.hero_image_url, { width: 1200, height: 630, resize: 'cover' })
    ?? 'https://truvex.app/og-image.jpg';
  const publishedIso = new Date(post.published_at).toISOString();
  const modifiedIso = post.updated_at
    ? new Date(post.updated_at).toISOString()
    : publishedIso;
  const titleTag = `${truncateTitle(post.title, 55)} | Truvex`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: post.title,
        description,
        image: [ogImage],
        datePublished: publishedIso,
        dateModified: modifiedIso,
        inLanguage: 'en-US',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: {
          '@type': 'Person',
          name: 'Ozan Atmar',
          url: 'https://truvex.app/about',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Truvex',
          url: 'https://truvex.app',
          logo: {
            '@type': 'ImageObject',
            url: 'https://truvex.app/icon-512.png',
            width: 512,
            height: 512,
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://truvex.app/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://truvex.app/blog' },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  // Optional second JSON-LD block (HowTo, FAQPage, etc.) layered alongside
  // the BlogPosting graph. The @context is added so the block is standalone.
  const extraJsonLd = post.schema_type && post.schema_data
    ? { '@context': 'https://schema.org', '@type': post.schema_type, ...post.schema_data }
    : null;

  return (
    <>
      <Head>
        <title>{titleTag}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="Truvex" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={heroAlt} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="article:published_time" content={publishedIso} />
        <meta property="article:modified_time" content={modifiedIso} />
        <meta property="article:author" content="Ozan Atmar" />
        <meta property="article:publisher" content="https://truvex.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={heroAlt} />
        <link rel="canonical" href={url} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {extraJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(extraJsonLd) }}
          />
        )}
      </Head>

      <BlogLayout>
        {/* ARTICLE */}
        <main style={styles.main}>
          <article style={styles.article}>
            <Link href="/blog" style={styles.backLink}>← All posts</Link>
            <header style={styles.header}>
              <p style={styles.date}>{publishedDate}</p>
              <h1 style={styles.title}>{post.title}</h1>
              {post.description && (
                <p style={styles.description}>{post.description}</p>
              )}
            </header>

            {post.hero_image_url && (
              <div style={styles.heroWrap}>
                <img
                  src={post.hero_image_url}
                  alt={heroAlt}
                  style={styles.heroImg}
                  width={1536}
                  height={1024}
                  loading="eager"
                />
              </div>
            )}

            {toc.length >= 3 && (
              <nav aria-label="Table of contents" style={styles.toc}>
                <p style={styles.tocLabel}>In this post</p>
                <ol style={styles.tocList}>
                  {toc.map((item) => (
                    <li key={item.id} style={styles.tocItem}>
                      <a href={`#${item.id}`} style={styles.tocLink}>
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

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
      </BlogLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { slug } = ctx.params as { slug: string };

  const { data, error } = await supabase
    .schema('truvex')
    .from('blog_posts')
    .select(
      'id, title, slug, description, body_html, published_at, updated_at, hero_image_url, hero_image_alt, schema_type, schema_data'
    )
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return { notFound: true };
  }

  return { props: { post: data } };
};

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  article: {},
  backLink: {
    display: 'inline-block',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: '#4A4A5A',
    textDecoration: 'none',
    marginBottom: 28,
  },
  header: {
    marginBottom: 40,
    paddingBottom: 32,
    borderBottom: '1px solid #e8e8ec',
  },
  heroWrap: {
    marginBottom: 40,
    borderRadius: 18,
    overflow: 'hidden',
    background: '#e8e8ec',
  },
  heroImg: {
    display: 'block',
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
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
  toc: {
    background: '#f7f7f9',
    border: '1px solid #e8e8ec',
    borderRadius: 14,
    padding: '20px 24px',
    marginBottom: 40,
  },
  tocLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: '#4A4A5A',
    margin: '0 0 10px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  tocList: {
    margin: 0,
    padding: '0 0 0 20px',
    fontSize: 15,
    lineHeight: 1.7,
    color: '#1A1A2E',
  },
  tocItem: {
    marginBottom: 2,
  },
  tocLink: {
    color: '#0E7C7B',
    textDecoration: 'none',
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
