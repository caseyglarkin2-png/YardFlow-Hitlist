import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

/**
 * POST /api/enrollments/[id]/resume
 * Resume a paused enrollment
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const { id } = await params;

  try {
    const enrollment = await prisma.sequence_enrollments.findUnique({
      where: { id },
      include: {
        sequence: { select: { id: true, name: true } },
        people: { select: { id: true, name: true, email: true } },
        sequence_steps: { orderBy: { step_number: 'asc' } },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'Enrollment not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Can only resume EXITED enrollments that were paused (not failed/completed)
    const isPaused =
      enrollment.status === 'EXITED' && enrollment.exit_reason?.startsWith('PAUSED:');

    if (!isPaused) {
      return NextResponse.json(
        {
          error: 'INVALID_STATE',
          message: `Cannot resume enrollment with status: ${enrollment.status.toLowerCase()}. Only paused enrollments can be resumed.`,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Calculate next step time (now + 1 hour for immediate resumption)
    const nextStepAt = new Date(Date.now() + 60 * 60 * 1000);

    const updated = await prisma.sequence_enrollments.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        exited_at: null,
        exit_reason: null,
      },
      include: {
        sequence: { select: { id: true, name: true } },
        people: { select: { id: true, name: true, email: true } },
        sequence_steps: { orderBy: { step_number: 'asc' } },
      },
    });

    logger.info('Enrollment resumed', { id });

    // Build response
    const steps = updated.sequence_steps;
    const result = {
      success: true,
      enrollment: {
        id: updated.id,
        prospectId: updated.contact_id,
        sequenceId: updated.sequence_id,
        status: 'active',
        currentStep: updated.current_step,
        totalSteps: steps.length,
        startedAt: updated.enrolled_at.toISOString(),
        metrics: {
          emailsSent: steps.filter((s) => s.sent_at).length,
          emailsOpened: steps.filter((s) => s.opened_at).length,
          emailsClicked: steps.filter((s) => s.clicked_at).length,
          repliesReceived: steps.filter((s) => s.replied_at).length,
        },
      },
      nextStepAt: nextStepAt.toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    captureRouteError(err, {
      route: '/api/enrollments/[id]/resume',
      method: 'POST',
    });
    logger.error('Failed to resume enrollment', { id, error: String(err) });
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
