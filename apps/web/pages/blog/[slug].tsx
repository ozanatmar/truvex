import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
              dangerouslySetInnerHTML={{ __html: post.body_html }}
            />

            <footer style={styles.footer}>
              <div style={styles.cta}>
                <p style={styles.ctaText}>
                  Truvex fills last-minute shift callouts in seconds.
                  One tap, every qualified worker notified.
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
