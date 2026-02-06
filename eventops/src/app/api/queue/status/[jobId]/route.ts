import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = params;

    // Import queues dynamically to avoid Redis connection during build
    const { enrichmentQueue, outreachQueue, sequenceQueue } = await import('@/lib/queue/queues');

    // Try to find job in all queues
    let job = await enrichmentQueue.getJob(jobId);
    let queueName = 'enrichment';

    if (!job) {
      job = await outreachQueue.getJob(jobId);
      queueName = 'outreach';
    }

    if (!job) {
      job = await sequenceQueue.getJob(jobId);
      queueName = 'sequence';
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // At this point job is guaranteed to exist
    const jobFound = job!;
    const state = await jobFound.getState();
    const progress = jobFound.progress;

    return NextResponse.json({
      jobId: jobFound.id,
      name: jobFound.name,
      queue: queueName,
      state,
      progress,
      data: jobFound.data,
      result: jobFound.returnvalue,
      error: jobFound.failedReason,
      attempts: jobFound.attemptsMade,
      timestamp: {
        created: jobFound.timestamp,
        processed: jobFound.processedOn,
        finished: jobFound.finishedOn,
      },
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/queue/status/[jobId]',
      method: 'GET',
    });
    logger.error('Error fetching job status', { jobId: params.jobId, error });
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 });
  }
}
