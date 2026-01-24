import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import queues dynamically to avoid Redis connection during build
    const { enrichmentQueue, outreachQueue, emailQueue, sequenceQueue } = await import('@/lib/queue/queues');

    // Get counts for all queues
    const [enrichmentCounts, outreachCounts, emailCounts, sequenceCounts] = await Promise.all([
      enrichmentQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed'),
      outreachQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed'),
      emailQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed'),
      sequenceQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed'),
    ]);

    // Get recent failed jobs
    const [enrichmentFailed, outreachFailed, emailFailed, sequenceFailed] = await Promise.all([
      enrichmentQueue.getFailed(0, 4),
      outreachQueue.getFailed(0, 4),
      emailQueue.getFailed(0, 4),
      sequenceQueue.getFailed(0, 4),
    ]);

    const response = {
      timestamp: new Date(),
      queues: {
        enrichment: {
          ...enrichmentCounts,
          recentFailures: enrichmentFailed.map(job => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.failedOn,
          })),
        },
        outreach: {
          ...outreachCounts,
          recentFailures: outreachFailed.map(job => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.failedOn,
          })),
        },
        emails: {
          ...emailCounts,
          recentFailures: emailFailed.map(job => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.failedOn,
          })),
        },
        sequences: {
          ...sequenceCounts,
          recentFailures: sequenceFailed.map(job => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.failedOn,
          })),
        },
      },
      totals: {
        active: enrichmentCounts.active + outreachCounts.active + emailCounts.active + sequenceCounts.active,
        waiting: enrichmentCounts.waiting + outreachCounts.waiting + emailCounts.waiting + sequenceCounts.waiting,
        completed: enrichmentCounts.completed + outreachCounts.completed + emailCounts.completed + sequenceCounts.completed,
        failed: enrichmentCounts.failed + outreachCounts.failed + emailCounts.failed + sequenceCounts.failed,
        delayed: enrichmentCounts.delayed + outreachCounts.delayed + emailCounts.delayed + sequenceCounts.delayed,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Error fetching queue stats', { error });
    return NextResponse.json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    );
  }
}
