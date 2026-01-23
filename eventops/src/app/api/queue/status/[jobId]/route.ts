import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
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

    const state = await job.getState();
    const progress = job.progress;

    return NextResponse.json({
      jobId: job.id,
      name: job.name,
      queue: queueName,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      attempts: job.attemptsMade,
      timestamp: {
        created: job.timestamp,
        processed: job.processedOn,
        finished: job.finishedOn,
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
