import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobType, accountId, limit, force } = body;

    // Validate job type
    if (!['email-pattern', 'linkedin-enrichment', 'generate-emails'].includes(jobType)) {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
    }

    // Validate accountId
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Import queue function dynamically to avoid Redis connection during build
    const { addEnrichmentJob } = await import('@/lib/queue/queues');

    let job;
    switch (jobType) {
      case 'email-pattern':
        job = await addEnrichmentJob('email-pattern', {
          accountId,
          userId: authResult.userId,
        });
        break;

      case 'linkedin-enrichment':
        job = await addEnrichmentJob('linkedin-enrichment', {
          accountId,
          limit: limit || 50,
          userId: authResult.userId,
        });
        break;

      case 'generate-emails':
        job = await addEnrichmentJob('generate-emails', {
          accountId,
          force: force || false,
          userId: authResult.userId,
        });
        break;
    }

    if (!job) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    logger.info('Enrichment job queued', {
      jobType,
      accountId,
      jobId: job.id,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      jobType,
      accountId,
      queuedAt: new Date(),
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/queue/enrich',
      method: 'POST',
    });
    logger.error('Error queuing enrichment job', { error });
    return NextResponse.json({ error: 'Failed to queue job' }, { status: 500 });
  }
}
