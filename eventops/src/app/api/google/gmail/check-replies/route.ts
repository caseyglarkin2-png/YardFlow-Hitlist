import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { checkEmailReplies } from '@/lib/google/gmail';
import { googleCircuitBreaker } from '@/lib/google/circuit-breaker';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await googleCircuitBreaker.call(authResult.userId, () =>
      checkEmailReplies(authResult.userId)
    );

    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/google/gmail/check-replies',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Gmail reply check error:', error);

    const cbStatus = googleCircuitBreaker.getStatus(authResult.userId);
    const errorMessage = error instanceof Error ? error.message : 'Gmail reply check failed';

    return NextResponse.json(
      {
        error: errorMessage,
        circuitBreaker: cbStatus,
      },
      { status: cbStatus.state === 'open' ? 429 : 500 }
    );
  }
}
