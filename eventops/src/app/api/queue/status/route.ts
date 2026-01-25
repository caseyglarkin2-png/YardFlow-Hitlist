import { NextResponse, type NextRequest } from 'next/server';
import { getRedisConnection } from '@/lib/queue/client';
import { emailQueue, enrichmentQueue, outreachQueue, sequenceQueue } from '@/lib/queue/queues';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && authHeader === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
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
