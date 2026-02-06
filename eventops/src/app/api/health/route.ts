import { NextResponse } from 'next/server';
import { prisma, getPoolMetrics } from '@/lib/db';
import { getRedisConnection } from '@/lib/queue/client';
import { emailQueue, enrichmentQueue, outreachQueue, sequenceQueue } from '@/lib/queue/queues';
import { checkAIHealth } from '@/lib/ai/provider';

export const dynamic = 'force-dynamic';

// CRITICAL: App won't function without these
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'AUTH_SECRET', 'REDIS_URL'];

// OPTIONAL: Features degraded but app still works
const OPTIONAL_ENV_VARS = [
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SENDGRID_API_KEY',
  'CRON_SECRET',
];

async function checkEmailService() {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return { status: 'error', details: 'SENDGRID_API_KEY not configured' };
    }

    // Check recent email failures (last hour)
    const recentFailures = await prisma.outreach.count({
      where: {
        status: 'BOUNCED',
        updatedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    // Check recent successful sends
    const recentSends = await prisma.outreach.count({
      where: {
        status: 'SENT',
        sentAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentFailures > 10) {
      return {
        status: 'degraded',
        details: `${recentFailures} failures in last hour`,
        recentSends,
        recentFailures,
      };
    }

    return { status: 'ok', recentSends, recentFailures };
  } catch (error) {
    return { status: 'error', error: (error as Error).message };
  }
}

async function checkDatabase() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const pool = getPoolMetrics();
    return { status: 'ok', latencyMs: Date.now() - start, pool };
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

async function checkWorkerHealth() {
  const start = Date.now();
  try {
    const redis = getRedisConnection();
    const lastHeartbeat = await redis.get('worker:last_heartbeat');

    if (!lastHeartbeat) {
      return { status: 'warning', message: 'No heartbeat found', latencyMs: Date.now() - start };
    }

    const lag = Date.now() - parseInt(lastHeartbeat, 10);
    // Threshold: 3 minutes (allows for 2 missed beats + some delay)
    if (lag > 3 * 60 * 1000) {
      return {
        status: 'error',
        message: `Worker stalled. Last heartbeat ${Math.round(lag / 1000)}s ago`,
        latencyMs: Date.now() - start,
      };
    }

    return { status: 'ok', lagMs: lag, latencyMs: Date.now() - start };
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
  // Graceful handling of checks - never crash this endpoint
  const criticalMissing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  const optionalMissing = OPTIONAL_ENV_VARS.filter((key) => !process.env[key]);

  // Run checks in parallel — never let one slow check block the entire health endpoint
  // Use Promise.allSettled so a timeout in one check doesn't crash the rest
  const [dbResult, redisResult, workerResult, queueResult, emailResult, aiResult] =
    await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkWorkerHealth(),
      getQueueCounts(),
      checkEmailService(),
      checkAIHealth(),
    ]);

  const settled = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
    result.status === 'fulfilled' ? result.value : fallback;

  const dbCheck = settled(dbResult, { status: 'fatal', error: String((dbResult as PromiseRejectedResult).reason) });
  const redisCheck = settled(redisResult, { status: 'fatal', error: String((redisResult as PromiseRejectedResult).reason) });
  const workerCheck = settled(workerResult, { status: 'fatal', error: String((workerResult as PromiseRejectedResult).reason) });
  const queueCheck = settled(queueResult, { status: 'fatal', error: String((queueResult as PromiseRejectedResult).reason) });
  const emailCheck = settled(emailResult, { status: 'fatal', error: String((emailResult as PromiseRejectedResult).reason) });
  const aiCheck = settled(aiResult, { status: 'fatal', error: String((aiResult as PromiseRejectedResult).reason) });

  // Healthy = DB + Redis + Worker + Critical Env Vars
  const healthy =
    dbCheck.status === 'ok' &&
    redisCheck.status === 'ok' &&
    criticalMissing.length === 0 &&
    workerCheck.status !== 'error';

  const response = {
    // If DB is down, we are DEGRADED but the Web App is UP.
    status: healthy ? 'healthy' : 'degraded',
    checks: {
      system: { status: 'ok', uptime: process.uptime() },
      environment: {
        status: criticalMissing.length === 0 ? 'ok' : 'critical',
        criticalMissing,
        optionalMissing,
      },
      database: dbCheck,
      redis: redisCheck,
      worker: workerCheck,
      queues: queueCheck,
      email: emailCheck,
      ai: aiCheck,
    },
    timestamp: new Date().toISOString(),
  };

  // Return 200 even if degraded - the app is running
  // Return 503 only if CRITICAL infrastructure is missing
  const statusCode = healthy ? 200 : 503;
  return NextResponse.json(response, { status: statusCode });
}
