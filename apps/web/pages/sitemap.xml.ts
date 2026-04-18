import { GetServerSideProps } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://truvex.app';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: string;
}

function buildXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${e.loc}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const isLaunched = process.env.IS_LAUNCHED === 'true';

  const { data: posts } = await supabase
    .schema('truvex')
    .from('blog_posts')
    .select('slug, published_at')
    .order('published_at', { ascending: false });

  const today = new Date().toISOString().split('T')[0];
  const entries: SitemapEntry[] = [];

  // Blog index + posts are always indexable (allowlisted through the launch gate)
  entries.push({ loc: `${SITE_URL}/blog`, lastmod: today, changefreq: 'weekly', priority: '0.8' });
  for (const p of posts ?? []) {
    entries.push({
      loc: `${SITE_URL}/blog/${p.slug}`,
      lastmod: (p.published_at as string).split('T')[0],
      changefreq: 'monthly',
      priority: '0.7',
    });
  }

  // Marketing surfaces only appear in the sitemap once the site is live
  if (isLaunched) {
    entries.unshift(
      { loc: `${SITE_URL}/`, lastmod: today, changefreq: 'weekly', priority: '1.0' },
      { loc: `${SITE_URL}/about`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
      { loc: `${SITE_URL}/contact`, lastmod: today, changefreq: 'yearly', priority: '0.5' },
      { loc: `${SITE_URL}/privacy`, lastmod: today, changefreq: 'yearly', priority: '0.3' },
      { loc: `${SITE_URL}/terms`, lastmod: today, changefreq: 'yearly', priority: '0.3' },
      { loc: `${SITE_URL}/cookies`, lastmod: today, changefreq: 'yearly', priority: '0.3' }
    );
  }

  const xml = buildXml(entries);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();
  return { props: {} };
};

export default Sitemap;
