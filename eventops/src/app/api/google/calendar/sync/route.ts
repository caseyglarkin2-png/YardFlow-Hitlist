import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { syncCalendarEvents } from '@/lib/google/calendar';
import { googleCircuitBreaker } from '@/lib/google/circuit-breaker';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun, days } = body;

    const result = await googleCircuitBreaker.call(authResult.userId, () =>
      syncCalendarEvents(authResult.userId, { dryRun, days })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Calendar sync error:', error);

    const cbStatus = googleCircuitBreaker.getStatus(authResult.userId);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Calendar sync failed',
        circuitBreaker: cbStatus,
      },
      { status: cbStatus.state === 'open' ? 429 : 500 }
    );
  }
}
