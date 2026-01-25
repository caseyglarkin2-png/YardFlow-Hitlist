import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRedisConnection } from '@/lib/queue/client';
import { emailQueue, enrichmentQueue, outreachQueue, sequenceQueue } from '@/lib/queue/queues';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'REDIS_URL',
  'GEMINI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SENDGRID_API_KEY',
  'CRON_SECRET',
];

async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (error) {
    return { status: 'error', error: (error as Error).message, latencyMs: Date.now() - start };
  }
}

async function checkRedis() {
  const start = Date.now();
  try {
    const redis = getRedisConnection();
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (error) {
    return { status: 'error', error: (error as Error).message, latencyMs: Date.now() - start };
  }
}

async function getQueueCounts() {
  try {
    const [enrichment, outreach, emails, sequence] = await Promise.all([
      enrichmentQueue.getJobCounts(),
      outreachQueue.getJobCounts(),
      emailQueue.getJobCounts(),
      sequenceQueue.getJobCounts(),
    ]);

    return {
      status: 'ok',
      queues: {
        enrichment,
        outreach,
        emails,
        sequence,
      },
    };
  } catch (error) {
    return { status: 'error', error: (error as Error).message };
  }
}

export async function GET() {
  const envMissing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  const [db, redis, queueCounts] = await Promise.all([checkDatabase(), checkRedis(), getQueueCounts()]);

  const healthy =
    db.status === 'ok' && redis.status === 'ok' && envMissing.length === 0 && queueCounts.status === 'ok';

  const response = {
    status: healthy ? 'ok' : 'degraded',
    checks: {
      environment: {
        status: envMissing.length === 0 ? 'ok' : 'missing',
        missing: envMissing,
      },
      database: db,
      redis,
      queues: queueCounts,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: healthy ? 200 : 503 });
}
