/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/pre-launch', destination: '/pre-launch.html' },
      { source: '/about-pre-launch', destination: '/about-pre-launch.html' },
    ];
  },
};

module.exports = nextConfig;
