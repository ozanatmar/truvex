import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import BlogLayout from '../../components/BlogLayout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PostSummary {
  title: string;
  slug: string;
  description: string | null;
  published_at: string;
  hero_image_url: string | null;
}

export default function BlogIndex({ posts }: { posts: PostSummary[] }) {
  const description =
    'Practical advice for restaurant and hospitality managers on shift coverage, scheduling, and team management.';
  const url = 'https://truvex.app/blog';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${url}#blog`,
        name: 'Truvex Blog',
        description,
        url,
        inLanguage: 'en-US',
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
        blogPost: posts.slice(0, 20).map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          description: p.description ?? p.title,
          url: `https://truvex.app/blog/${p.slug}`,
          datePublished: new Date(p.published_at).toISOString(),
          ...(p.hero_image_url ? { image: [p.hero_image_url] } : {}),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://truvex.app/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: url },
        ],
      },
    ],
  };

  return (
    <>
      <Head>
        <title>Blog — Truvex</title>
        <meta name="description" content={description} />
        <meta property="og:title" content="Truvex Blog" />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content="Truvex" />
        <meta property="og:image" content="https://truvex.app/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Truvex Blog" />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://truvex.app/og-image.jpg" />
        <link rel="canonical" href={url} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <BlogLayout>
        <main style={styles.main}>
          <header style={styles.header}>
            <h1 style={styles.heading}>Blog</h1>
            <p style={styles.subheading}>
              Practical reads for restaurant and hospitality managers.
            </p>
          </header>

          {posts.length === 0 ? (
            <p style={{ color: '#8A8A9A', fontFamily: "'DM Sans', sans-serif" }}>
              No posts yet. Check back soon.
            </p>
          ) : (
            <div style={styles.grid}>
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  style={styles.card}
                  className="blog-card"
                >
                  {post.hero_image_url && (
                    <div style={styles.thumbWrap}>
                      <img
                        src={post.hero_image_url}
                        alt={post.title}
                        style={styles.thumbImg}
                        width={320}
                        height={213}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div style={styles.cardBody}>
                    <p style={styles.cardDate}>
                      {new Date(post.published_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <h2 style={styles.cardTitle}>{post.title}</h2>
                    {post.description && (
                      <p style={styles.cardDesc}>{post.description}</p>
                    )}
                    <span style={styles.cardLink}>Read →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </BlogLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const { data, error } = await supabase
    .schema('truvex')
    .from('blog_posts')
    .select('title, slug, description, published_at, hero_image_url')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    return { props: { posts: [] } };
  }

  return { props: { posts: data ?? [] } };
};

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  header: {
    marginBottom: 48,
  },
  heading: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 40,
    fontWeight: 800,
    color: '#1A1A2E',
    margin: '0 0 8px',
  },
  subheading: {
    fontSize: 17,
    color: '#4A4A5A',
    margin: 0,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  card: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: 24,
    padding: '28px 0',
    borderBottom: '1px solid #e8e8ec',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'opacity 0.15s',
    alignItems: 'start',
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: '3 / 2',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#e8e8ec',
  },
  thumbImg: {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardBody: {
    minWidth: 0,
  },
  cardDate: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: '#8A8A9A',
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  cardTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: '#1A1A2E',
    margin: '0 0 8px',
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: 15,
    color: '#4A4A5A',
    margin: '0 0 12px',
    lineHeight: 1.6,
  },
  cardLink: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#0E7C7B',
  },
};
