import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

// Force dynamic rendering - never statically generate this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'not-configured';
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheck;
    auth: HealthCheck;
    env: HealthCheck;
    redis: HealthCheck;
  };
  responseTime: number;
}

export async function GET() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const checks: HealthResponse['checks'] = {
    database: { status: 'unhealthy' },
    auth: { status: 'unhealthy' },
    env: { status: 'unhealthy' },
    redis: { status: 'not-configured' },
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      message: 'Database connection successful',
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // Check auth system
  try {
    // Test that auth module can be called without errors
    const session = await auth();
    checks.auth = {
      status: 'healthy',
      message: session
        ? 'Auth system operational (session found)'
        : 'Auth system operational (no session)',
    };
  } catch (error) {
    checks.auth = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Auth system failed',
    };
  }

  // Check environment variables
  try {
    const requiredEnvVars = ['DATABASE_URL', 'AUTH_SECRET'];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      checks.env = {
        status: 'unhealthy',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
      };
    } else {
      checks.env = {
        status: 'healthy',
        message: 'All required environment variables present',
      };
    }
  } catch (error) {
    checks.env = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Environment check failed',
    };
  }

  // Check Redis connection (if configured)
  if (process.env.REDIS_URL) {
    try {
      const { getRedisConnection } = await import('@/lib/queue/client');
      const redis = getRedisConnection();
      await redis.ping();
      checks.redis = {
        status: 'healthy',
        message: 'Redis connection successful',
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  } else {
    checks.redis = {
      status: 'not-configured',
      message: 'Redis not configured (optional)',
    };
  }

  // Determine overall health status
  const allHealthy = Object.values(checks).every(
    (check) => check.status === 'healthy' || check.status === 'not-configured'
  );

  const hasCriticalFailure =
    checks.database.status === 'unhealthy' ||
    checks.auth.status === 'unhealthy' ||
    checks.env.status === 'unhealthy';

  const response: HealthResponse = {
    status: hasCriticalFailure ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
    timestamp,
    checks,
    responseTime: Date.now() - startTime,
  };

  const statusCode =
    response.status === 'healthy' ? 200 : response.status === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
