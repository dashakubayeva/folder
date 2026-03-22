/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Railway deployment
  output: 'standalone',
  // Exclude server-side-only packages from webpack bundling (Next.js 14)
  experimental: {
    serverComponentsExternalPackages: ['lighthouse', 'chrome-launcher', '@paulirish/trace_engine'],
  },
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
