import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session
 * Get current session info (for auth bridge)
 */
export async function GET(request: NextRequest) {
  try {
    // Try session auth first
    const session = await auth();
    
    if (session?.user) {
      return NextResponse.json({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        expiresAt: session.expires,
      });
    }

    // Try S2S auth
    const authResult = await authServiceOrSession(request);
    if (authResult) {
      return NextResponse.json({
        user: {
          id: authResult.userId,
          email: authResult.email,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
      });
    }

    return NextResponse.json({
      error: 'NOT_AUTHENTICATED',
      message: 'No valid session found',
      statusCode: 401
    }, { status: 401 });
  } catch (err) {
    logger.error('Session check failed', { error: String(err) });
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
      statusCode: 500
    }, { status: 500 });
  }
}
