import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRedisConnection } from '@/lib/queue/client';
import { emailQueue, enrichmentQueue, outreachQueue, sequenceQueue } from '@/lib/queue/queues';

export const dynamic = 'force-dynamic';

// CRITICAL: App won't function without these
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'REDIS_URL',
];

// OPTIONAL: Features degraded but app still works
const OPTIONAL_ENV_VARS = [
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
  // Graceful handling of checks - never crash this endpoint
  const criticalMissing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  const optionalMissing = OPTIONAL_ENV_VARS.filter((key) => !process.env[key]);
  
  // Run checks in parallel but catch all errors individually
  // We want to return a 200/503 response, not a 500 runtime exception
  let dbCheck, redisCheck, queueCheck;
  
  try { dbCheck = await checkDatabase(); } catch(e) { dbCheck = { status: 'fatal', error: String(e) } }
  try { redisCheck = await checkRedis(); } catch(e) { redisCheck = { status: 'fatal', error: String(e) } }
  try { queueCheck = await getQueueCounts(); } catch(e) { queueCheck = { status: 'fatal', error: String(e) } }

  // Healthy = DB + Redis + Critical Env Vars
  const healthy =
    dbCheck.status === 'ok' && 
    redisCheck.status === 'ok' && 
    criticalMissing.length === 0;

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
      queues: queueCheck,
    },
    timestamp: new Date().toISOString(),
  };

  // Return 200 even if degraded - the app is running
  // Return 503 only if CRITICAL infrastructure is missing
  const statusCode = criticalMissing.length > 0 || dbCheck.status !== 'ok' ? 503 : 200;
  return NextResponse.json(response, { status: statusCode });
}
