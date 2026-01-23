import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    auth: HealthCheck;
    env: HealthCheck;
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: HealthResponse['checks'] = {
    database: { status: 'unhealthy' },
    auth: { status: 'unhealthy' },
    env: { status: 'unhealthy' },
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
      message: session ? 'Auth system operational (session found)' : 'Auth system operational (no session)',
    };
  } catch (error) {
    checks.auth = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Auth system failed',
    };
  }

  // Check environment variables
  try {
    const requiredEnvVars = [
      'DATABASE_URL',
      'AUTH_SECRET',
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

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

  // Determine overall health status
  const allHealthy = Object.values(checks).every(
    (check) => check.status === 'healthy'
  );

  const response: HealthResponse = {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    checks,
  };

  const statusCode = allHealthy ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
