import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PostSummary {
  title: string;
  slug: string;
  description: string | null;
  published_at: string;
}

export default function BlogIndex({ posts }: { posts: PostSummary[] }) {
  return (
    <>
      <Head>
        <title>Blog — Truvex</title>
        <meta
          name="description"
          content="Practical advice for restaurant and hospitality managers on shift coverage, scheduling, and team management."
        />
        <link rel="canonical" href="https://truvex.app/blog" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
        <style>{`body { background: #FAFAF8; }`}</style>
      </Head>

      <div style={styles.page}>
        <nav style={styles.nav}>
          <div style={styles.navInner}>
            <Link href="/" style={styles.navLogo}>Truvex</Link>
          </div>
        </nav>

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
                >
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
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, description, published_at')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    return { props: { posts: [] } };
  }

  return { props: { posts: data ?? [] } };
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
  },
  navLogo: {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 800,
    fontSize: 20,
    color: '#0E7C7B',
    textDecoration: 'none',
  },
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
    display: 'block',
    padding: '28px 0',
    borderBottom: '1px solid #e8e8ec',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'opacity 0.15s',
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
