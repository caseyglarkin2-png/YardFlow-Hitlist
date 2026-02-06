import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use standalone output for Railway deployment
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: ['@/components', '@/lib'],
    // Emergency OOM Fix: Force single-threaded build
    workerThreads: false,
    cpus: 1,
  },
  // Optimize build for Railway memory limits
  swcMinify: true,
  // Performance: strip console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Disable type checking and linting during builds (run in CI instead)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // CORS headers for cross-origin API access (GTM Vercel frontend)
  async headers() {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

    // Default origins if not set
    const primaryOrigin =
      allowedOrigins.length > 0 ? allowedOrigins[0] : 'https://gtm-yard-flow.vercel.app';

    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: primaryOrigin,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, x-service-key, x-user-id, x-user-email',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: 'dude-whats-the-bid-llc',
  project: 'yardflow-hitlist',

  // Suppress source map upload logs
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Disable Sentry telemetry
  disableLogger: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  automaticVercelMonitors: true,
});
