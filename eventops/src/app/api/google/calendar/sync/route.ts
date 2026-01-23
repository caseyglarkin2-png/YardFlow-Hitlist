import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncCalendarEvents } from '@/lib/google/calendar';
import { googleCircuitBreaker } from '@/lib/google/circuit-breaker';

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun, days } = body;

    const result = await googleCircuitBreaker.call(
      session.user.id,
      () => syncCalendarEvents(session.user.id, { dryRun, days })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Calendar sync error:', error);

    const cbStatus = googleCircuitBreaker.getStatus(session.user.id);

    return NextResponse.json(
      {
        error: error.message || 'Calendar sync failed',
        circuitBreaker: cbStatus,
      },
      { status: cbStatus.state === 'open' ? 429 : 500 }
    );
  }
}
