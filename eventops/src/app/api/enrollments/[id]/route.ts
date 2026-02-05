import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

interface EnrollmentMetrics {
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  repliesReceived: number;
}

/**
 * GET /api/enrollments/[id]
 * Get a single enrollment by ID with metrics
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const { id } = await params;

  try {
    const enrollment = await prisma.sequence_enrollments.findUnique({
      where: { id },
      include: {
        sequence: { select: { id: true, name: true } },
        people: { select: { id: true, name: true, email: true } },
        sequence_steps: {
          orderBy: { step_number: 'asc' },
          select: {
            id: true,
            step_number: true,
            status: true,
            sent_at: true,
            opened_at: true,
            clicked_at: true,
            replied_at: true,
          },
        },
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

    // Calculate metrics from steps
    const steps = enrollment.sequence_steps;
    const metrics: EnrollmentMetrics = {
      emailsSent: steps.filter((s) => s.sent_at).length,
      emailsOpened: steps.filter((s) => s.opened_at).length,
      emailsClicked: steps.filter((s) => s.clicked_at).length,
      repliesReceived: steps.filter((s) => s.replied_at).length,
    };

    // Find next step
    const nextStep = steps.find((s) => s.status === 'PENDING');

    // Map to GTM-expected format
    const result = {
      id: enrollment.id,
      prospectId: enrollment.contact_id,
      sequenceId: enrollment.sequence_id,
      status: enrollment.status.toLowerCase(),
      currentStep: enrollment.current_step,
      totalSteps: steps.length,
      startedAt: enrollment.enrolled_at.toISOString(),
      lastStepAt: steps
        .filter((s) => s.sent_at)
        .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime())[0]
        ?.sent_at?.toISOString(),
      nextStepAt: nextStep ? undefined : undefined, // Would need scheduled_at on steps
      pausedAt: enrollment.status === 'EXITED' ? enrollment.exited_at?.toISOString() : undefined,
      pauseReason: enrollment.exit_reason,
      completedAt: enrollment.completed_at?.toISOString(),
      stoppedAt: enrollment.exited_at?.toISOString(),
      stopReason: enrollment.exit_reason,
      metrics,
      // Include related data
      sequence: enrollment.sequence,
      prospect: enrollment.people,
    };

    return NextResponse.json(result);
  } catch (err) {
    captureRouteError(err, {
      route: '/api/enrollments/[id]',
      method: 'GET',
    });
    logger.error('Failed to fetch enrollment', { id, error: String(err) });
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

/**
 * DELETE /api/enrollments/[id]
 * Stop an enrollment permanently
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const { id } = await params;
  const reason = request.nextUrl.searchParams.get('reason') || 'Manual stop';

  try {
    const enrollment = await prisma.sequence_enrollments.findUnique({
      where: { id },
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

    await prisma.sequence_enrollments.update({
      where: { id },
      data: {
        status: 'EXITED',
        exited_at: new Date(),
        exit_reason: reason,
      },
    });

    logger.info('Enrollment stopped', { id, reason });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    captureRouteError(err, {
      route: '/api/enrollments/[id]',
      method: 'DELETE',
    });
    logger.error('Failed to stop enrollment', { id, error: String(err) });
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
