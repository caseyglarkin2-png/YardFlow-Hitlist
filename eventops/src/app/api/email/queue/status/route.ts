import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getRedisConnection } from '@/lib/queue/client';
import { emailQueue } from '@/lib/queue/queues';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/queue/status
 * Get current queue status for monitoring
 */
export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const redis = getRedisConnection();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get BullMQ queue stats
    const queue = emailQueue.queue;
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    // Get sequence step stats as proxy for email queue
    const [pendingSteps, sentLast24h, failedLast24h] = await Promise.all([
      prisma.sequence_steps.count({
        where: { status: 'PENDING' },
      }),
      prisma.sequence_steps.count({
        where: {
          status: 'SENT',
          sent_at: { gte: yesterday },
        },
      }),
      prisma.sequence_steps.count({
        where: {
          status: 'FAILED',
          updatedAt: { gte: yesterday },
        },
      }),
    ]);

    // Get oldest pending step
    const oldestPending = await prisma.sequence_steps.findFirst({
      where: { status: 'PENDING' },
      orderBy: { scheduled_at: 'asc' },
      select: { scheduled_at: true },
    });

    // Note: SendGrid rate limit would need API call to check
    // For now, return a placeholder
    const rateLimitRemaining = 100; // Would need SendGrid API integration

    const status = {
      queued: waiting + pendingSteps,
      processing: active,
      sent24h: sentLast24h,
      failed24h: failedLast24h,
      deadLetter: failed,
      rateLimitRemaining,
      oldestQueuedAt: oldestPending?.scheduled_at?.toISOString(),
      // Additional BullMQ stats
      bullmq: {
        waiting,
        active,
        completed,
        failed,
      },
    };

    return NextResponse.json(status);
  } catch (err) {
    logger.error('Failed to get queue status', { error: String(err) });
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
