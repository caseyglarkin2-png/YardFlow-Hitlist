import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { emailQueue } from '@/lib/queue/queues';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/health
 * Email service health check for SystemHealth component
 */
export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const checks = {
      sendgrid: { status: 'unknown', rateLimitRemaining: 0 },
      queue: { depth: 0, oldestMessage: undefined as string | undefined },
      lastSentAt: undefined as string | undefined,
    };

    // Check BullMQ queue
    try {
      const queue = emailQueue.queue;
      const waiting = await queue.getWaitingCount();
      const active = await queue.getActiveCount();
      checks.queue.depth = waiting + active;

      // Get oldest pending email from sequence_steps
      const oldest = await prisma.sequence_steps.findFirst({
        where: { status: 'PENDING' },
        orderBy: { scheduled_at: 'asc' },
        select: { scheduled_at: true }
      });
      checks.queue.oldestMessage = oldest?.scheduled_at?.toISOString();
    } catch (e) {
      logger.warn('Queue check failed', { error: String(e) });
    }

    // Get last sent email
    try {
      const lastSent = await prisma.sequence_steps.findFirst({
        where: { sent_at: { not: null } },
        orderBy: { sent_at: 'desc' },
        select: { sent_at: true }
      });
      checks.lastSentAt = lastSent?.sent_at?.toISOString();
    } catch (e) {
      logger.warn('Last sent check failed', { error: String(e) });
    }

    // Check SendGrid API key existence (not the actual API for rate limiting)
    const hasSendgridKey = !!process.env.SENDGRID_API_KEY;
    checks.sendgrid = {
      status: hasSendgridKey ? 'configured' : 'missing',
      rateLimitRemaining: hasSendgridKey ? 100 : 0, // Would need actual API call
    };

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!hasSendgridKey) {
      status = 'unhealthy';
    } else if (checks.queue.depth > 100) {
      status = 'degraded';
    }

    // Check if we've sent anything recently (last 24h)
    if (checks.lastSentAt) {
      const lastSentTime = new Date(checks.lastSentAt).getTime();
      const hoursSinceLastSend = (Date.now() - lastSentTime) / (1000 * 60 * 60);
      if (hoursSinceLastSend > 24) {
        status = status === 'healthy' ? 'degraded' : status;
      }
    }

    return NextResponse.json({
      status,
      sendgrid: checks.sendgrid,
      queue: checks.queue,
      lastSentAt: checks.lastSentAt,
    });
  } catch (err) {
    captureRouteError(err, {
      route: '/api/email/health',
      method: 'GET',
    });
    logger.error('Email health check failed', { error: String(err) });
    return NextResponse.json({
      status: 'unhealthy',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
