import { GetServerSideProps } from 'next';

function Robots() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /pre-launch',
    'Disallow: /about-pre-launch',
    'Disallow: /coming-soon',
    'Disallow: /upgrade',
    'Disallow: /success',
    'Disallow: /subscription',
    'Disallow: /subscription/cancel',
    'Disallow: /subscription/return',
    'Disallow: /callout/',
    'Disallow: /api/',
    '',
    'Sitemap: https://truvex.app/sitemap.xml',
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(body);
  res.end();
  return { props: {} };
};

export default Robots;
