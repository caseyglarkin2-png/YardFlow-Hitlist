import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Request ID header name - used for tracing requests across services
 */
const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Allowed origins for CORS
 * Configure via ALLOWED_ORIGINS env var (comma-separated)
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://gtm-yard-flow.vercel.app').split(
  ','
);

/**
 * Generate a short unique request ID
 * Format: timestamp-random (e.g., "1706234567890-a1b2c3")
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Generate CORS headers for a given origin
 */
function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-service-key, x-user-id, x-user-email'
    );
    headers.set('Access-Control-Max-Age', '86400');
  }

  return headers;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const pathname = request.nextUrl.pathname;

  // Generate or propagate request ID for tracing
  const incomingRequestId = request.headers.get(REQUEST_ID_HEADER);
  const requestId = incomingRequestId || generateRequestId();

  // Handle CORS preflight for API routes
  if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
    const response = new NextResponse(null, {
      status: 200,
      headers: corsHeaders(origin),
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  // Protect dashboard routes - use getToken for Edge compatibility
  if (pathname.startsWith('/dashboard')) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      const signInUrl = new URL('/login', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Add request ID and CORS headers to API responses
  if (pathname.startsWith('/api')) {
    // Clone request headers and add request ID for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Add request ID to response for client-side correlation
    response.headers.set(REQUEST_ID_HEADER, requestId);

    // Add CORS headers
    const cors = corsHeaders(origin);
    cors.forEach((value, key) => response.headers.set(key, value));

    // Security headers
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
