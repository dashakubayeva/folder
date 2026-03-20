/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Railway deployment
  output: 'standalone',
  // Allow serving screenshots from data directory
  async headers() {
    return [
      {
        source: '/screenshots/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

module.exports = nextConfig;
