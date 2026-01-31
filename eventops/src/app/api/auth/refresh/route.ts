import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/refresh
 * Refresh session token
 * 
 * Note: NextAuth v5 handles token refresh automatically via JWT rotation.
 * This endpoint exists for explicit refresh requests from the GTM frontend.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({
        error: 'NOT_AUTHENTICATED',
        message: 'No valid session to refresh',
        statusCode: 401
      }, { status: 401 });
    }

    // NextAuth handles token refresh automatically
    // We just return the current session expiry
    // A true refresh would require updating the JWT
    
    logger.info('Session refresh requested', { userId: session.user.id });

    return NextResponse.json({
      success: true,
      expiresAt: session.expires,
    });
  } catch (err) {
    logger.error('Session refresh failed', { error: String(err) });
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
      statusCode: 500
    }, { status: 500 });
  }
}
