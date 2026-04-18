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

// Quiet mid-article aside. Not a hard sell — reads as a side note from the
// author, same brand voice as the surrounding copy.
const APP_STRIP_HTML = `
<aside style="margin: 36px 0; padding: 16px 20px; background: #f7f7f9; border-left: 3px solid #0E7C7B; border-radius: 6px; font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.6; color: #4A4A5A;">
  Truvex was built for this exact moment: one tap pings every qualified off-duty worker, and the manager picks who covers. Free for teams up to 10. <a href="https://truvex.app/#download" style="color: #0E7C7B; font-weight: 600; text-decoration: underline;">See how it works</a>.
</aside>
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

interface RelatedPost {
  title: string;
  slug: string;
  description: string | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
}

interface Props {
  post: BlogPost;
  related: RelatedPost[];
}

export default function BlogPostPage({ post, related }: Props) {
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
            <nav aria-label="Breadcrumb" style={styles.breadcrumb}>
              <Link href="/" style={styles.breadcrumbLink}>Home</Link>
              <span style={styles.breadcrumbSep}>/</span>
              <Link href="/blog" style={styles.breadcrumbLink}>Blog</Link>
              <span style={styles.breadcrumbSep}>/</span>
              <span style={styles.breadcrumbCurrent}>{post.title}</span>
            </nav>
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

            <div style={styles.shareRow} aria-label="Share this post">
              <span style={styles.shareLabel}>Share</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.shareBtn}
              >
                X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.shareBtn}
              >
                LinkedIn
              </a>
              <button
                type="button"
                style={styles.shareBtn}
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(url);
                  }
                }}
              >
                Copy link
              </button>
            </div>

            {related.length > 0 && (
              <section aria-label="Keep reading" style={styles.related}>
                <h2 style={styles.relatedHeading}>Keep reading</h2>
                <div style={styles.relatedGrid}>
                  {related.map((rp) => (
                    <Link
                      key={rp.slug}
                      href={`/blog/${rp.slug}`}
                      style={styles.relatedCard}
                      className="blog-related-card"
                    >
                      {rp.hero_image_url && (
                        <div style={styles.relatedThumbWrap}>
                          <img
                            src={optimizedImageUrl(rp.hero_image_url, { width: 400, height: 267, resize: 'cover' }) ?? rp.hero_image_url}
                            alt={rp.hero_image_alt && rp.hero_image_alt.trim().length > 0 ? rp.hero_image_alt : rp.title}
                            style={styles.relatedThumbImg}
                            width={400}
                            height={267}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <h3 style={styles.relatedTitle}>{rp.title}</h3>
                      {rp.description && (
                        <p style={styles.relatedDesc}>{rp.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <footer style={styles.footer}>
              <div style={styles.cta}>
                <p style={styles.ctaText}>
                  Truvex was built for this exact problem. Free for teams up to 10 workers, no credit card required.
                </p>
                <Link href="/#pricing" style={styles.ctaButton}>
                  Start Free, No Credit Card
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

  // Simple related-posts strategy: three most recent other posts. No tags
  // to match on yet, so recency is the honest signal until editorial
  // metadata justifies something smarter.
  const { data: relatedData } = await supabase
    .schema('truvex')
    .from('blog_posts')
    .select('title, slug, description, hero_image_url, hero_image_alt')
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .limit(3);

  return { props: { post: data, related: relatedData ?? [] } };
};

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  article: {},
  breadcrumb: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: '#8A8A9A',
    marginBottom: 28,
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  breadcrumbLink: {
    color: '#4A4A5A',
    fontWeight: 600,
    textDecoration: 'none',
  },
  breadcrumbSep: {
    color: '#c4c4cc',
  },
  breadcrumbCurrent: {
    color: '#8A8A9A',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 260,
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
  shareRow: {
    marginTop: 48,
    paddingTop: 24,
    borderTop: '1px solid #e8e8ec',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  shareLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#4A4A5A',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginRight: 6,
  },
  shareBtn: {
    display: 'inline-block',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: '#1A1A2E',
    background: '#fff',
    border: '1px solid #d8d8dc',
    borderRadius: 8,
    padding: '8px 14px',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  related: {
    marginTop: 56,
    paddingTop: 40,
    borderTop: '1px solid #e8e8ec',
  },
  relatedHeading: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#1A1A2E',
    margin: '0 0 20px',
  },
  relatedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
  },
  relatedCard: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
    padding: 12,
    borderRadius: 12,
    border: '1px solid #e8e8ec',
    background: '#fff',
  },
  relatedThumbWrap: {
    aspectRatio: '3 / 2',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#e8e8ec',
    marginBottom: 12,
  },
  relatedThumbImg: {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  relatedTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: '#1A1A2E',
    margin: '0 0 6px',
    lineHeight: 1.35,
  },
  relatedDesc: {
    fontSize: 13,
    color: '#4A4A5A',
    margin: 0,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
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
