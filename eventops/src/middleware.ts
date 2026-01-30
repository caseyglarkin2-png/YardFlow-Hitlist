import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Allowed origins for CORS
 * Configure via ALLOWED_ORIGINS env var (comma-separated)
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://gtm-yard-flow.vercel.app').split(',');

/**
 * Generate CORS headers for a given origin
 */
function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-service-key, x-user-id, x-user-email');
    headers.set('Access-Control-Max-Age', '86400');
  }
  
  return headers;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const pathname = request.nextUrl.pathname;
  
  // Handle CORS preflight for API routes
  if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
    return new NextResponse(null, { 
      status: 200, 
      headers: corsHeaders(origin) 
    });
  }
  
  // Run NextAuth protection for dashboard routes
  if (pathname.startsWith('/dashboard')) {
    return (auth as any)(request);
  }
  
  // Add CORS headers to API responses
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    const cors = corsHeaders(origin);
    cors.forEach((value, key) => response.headers.set(key, value));
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
  runtime: 'nodejs', // Force Node.js runtime for bcryptjs compatibility
};
