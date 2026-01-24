import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
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
  } catch (error: any) {
    logger.error('Error fetching job status', { jobId: params.jobId, error });
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
