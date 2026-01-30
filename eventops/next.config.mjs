/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use standalone output for Railway deployment
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Optimize build for Railway memory limits
  swcMinify: true,
  // Disable type checking and linting during builds (run in CI instead)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // CORS headers for cross-origin API access (GTM Vercel frontend)
  async headers() {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .filter(Boolean);
    
    // Default origins if not set
    const primaryOrigin = allowedOrigins.length > 0 
      ? allowedOrigins[0] 
      : 'https://gtm-yard-flow.vercel.app';
    
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

export default nextConfig;
