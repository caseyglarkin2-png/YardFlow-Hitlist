import { NextResponse, type NextRequest } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { captureRouteError } from '@/lib/sentry-utils';
import { getRedisConnection } from '@/lib/queue/client';
import { emailQueue, enrichmentQueue, outreachQueue, sequenceQueue } from '@/lib/queue/queues';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const redis = getRedisConnection();
    const [ping, enrichment, outreach, emails, sequence] = await Promise.all([
      redis.ping(),
      enrichmentQueue.getJobCounts(),
      outreachQueue.getJobCounts(),
      emailQueue.getJobCounts(),
      sequenceQueue.getJobCounts(),
    ]);

    return NextResponse.json({
      status: 'ok',
      redis: ping,
      queues: {
        enrichment,
        outreach,
        emails,
        sequence,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    captureRouteError(error, { route: '/api/queue/status', method: 'GET', userId: authResult?.userId });
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
