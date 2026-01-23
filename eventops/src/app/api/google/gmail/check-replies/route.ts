import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkEmailReplies } from '@/lib/google/gmail';
import { googleCircuitBreaker } from '@/lib/google/circuit-breaker';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await googleCircuitBreaker.call(
      session.user.id,
      () => checkEmailReplies(session.user.id)
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Gmail reply check error:', error);

    const cbStatus = googleCircuitBreaker.getStatus(session.user.id);

    return NextResponse.json(
      {
        error: error.message || 'Gmail reply check failed',
        circuitBreaker: cbStatus,
      },
      { status: cbStatus.state === 'open' ? 429 : 500 }
    );
  }
}
