import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRedisClient } from '@/lib/redis-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = {
    database: 'unknown',
    redis: 'unknown',
    timestamp: new Date().toISOString(),
  };

  let isHealthy = true;

  // 1. Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'healthy';
  } catch (error) {
    logger.error('Health check failed: Database', { error });
    status.database = 'unhealthy';
    isHealthy = false;
  }

  // 2. Check Redis
  try {
    const redis = getRedisClient();
    if (redis) {
      const pong = await redis.ping();
      if (pong === 'PONG') {
        status.redis = 'healthy';
      } else {
        throw new Error('Redis ping failed');
      }
    } else {
      if (process.env.REDIS_URL) {
        // Configured but failed to initialize
        status.redis = 'unhealthy (initialization failed)';
        isHealthy = false;
      } else {
        status.redis = 'disabled';
      }
    }
  } catch (error) {
    logger.error('Health check failed: Redis', { error });
    status.redis = 'unhealthy';
    isHealthy = false;
  }

  if (!isHealthy) {
    return NextResponse.json(status, { status: 503 });
  }

  return NextResponse.json(status, { status: 200 });
}
