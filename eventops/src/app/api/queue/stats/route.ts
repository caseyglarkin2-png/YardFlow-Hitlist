import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Import queues dynamically to avoid Redis connection during build
    const { enrichmentQueue, outreachQueue, emailQueue, sequenceQueue } =
      await import('@/lib/queue/queues');

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
          recentFailures: enrichmentFailed.map((job) => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.finishedOn,
          })),
        },
        outreach: {
          ...outreachCounts,
          recentFailures: outreachFailed.map((job) => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.finishedOn,
          })),
        },
        emails: {
          ...emailCounts,
          recentFailures: emailFailed.map((job) => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.finishedOn,
          })),
        },
        sequences: {
          ...sequenceCounts,
          recentFailures: sequenceFailed.map((job) => ({
            id: job.id,
            name: job.name,
            error: job.failedReason,
            timestamp: job.finishedOn,
          })),
        },
      },
      totals: {
        active:
          enrichmentCounts.active +
          outreachCounts.active +
          emailCounts.active +
          sequenceCounts.active,
        waiting:
          enrichmentCounts.waiting +
          outreachCounts.waiting +
          emailCounts.waiting +
          sequenceCounts.waiting,
        completed:
          enrichmentCounts.completed +
          outreachCounts.completed +
          emailCounts.completed +
          sequenceCounts.completed,
        failed:
          enrichmentCounts.failed +
          outreachCounts.failed +
          emailCounts.failed +
          sequenceCounts.failed,
        delayed:
          enrichmentCounts.delayed +
          outreachCounts.delayed +
          emailCounts.delayed +
          sequenceCounts.delayed,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching queue stats', { error });
    return NextResponse.json({ error: 'Failed to fetch queue stats' }, { status: 500 });
  }
}
