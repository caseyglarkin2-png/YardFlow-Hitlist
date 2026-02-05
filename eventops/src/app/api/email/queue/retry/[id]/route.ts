import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

/**
 * POST /api/email/queue/retry/[id]
 * Retry a failed email from dead letter queue
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const { id } = await params;

  try {
    const step = await prisma.sequence_steps.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            people: { select: { id: true, email: true } },
            sequence: { select: { id: true } },
          },
        },
      },
    });

    if (!step) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Email not found in dead letter queue',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (step.status !== 'FAILED') {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot retry email with status: ${step.status}`,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Reset to pending for retry
    await prisma.sequence_steps.update({
      where: { id },
      data: {
        status: 'PENDING',
        error_message: null,
        scheduled_at: new Date(), // Schedule for immediate send
      },
    });

    logger.info('Email requeued for retry', {
      stepId: id,
      enrollmentId: step.enrollment_id,
      prospectEmail: step.enrollment.people?.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Email requeued for sending',
    });
  } catch (err) {
    captureRouteError(err, {
      route: '/api/email/queue/retry/[id]',
      method: 'POST',
    });
    logger.error('Failed to retry email', { id, error: String(err) });
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
