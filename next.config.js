/** @type {import('next').NextConfig} */
const nextConfig = {
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
