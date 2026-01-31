import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/enrollments/[id]/pause
 * Pause an active enrollment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Manual pause';

    const enrollment = await prisma.sequence_enrollments.findUnique({
      where: { id },
      include: {
        sequence: { select: { id: true, name: true } },
        people: { select: { id: true, name: true, email: true } },
        sequence_steps: { orderBy: { step_number: 'asc' } }
      }
    });

    if (!enrollment) {
      return NextResponse.json({
        error: 'NOT_FOUND',
        message: 'Enrollment not found',
        statusCode: 404
      }, { status: 404 });
    }

    // Can only pause ACTIVE enrollments
    if (enrollment.status !== 'ACTIVE') {
      return NextResponse.json({
        error: 'INVALID_STATE',
        message: `Cannot pause enrollment with status: ${enrollment.status.toLowerCase()}`,
        statusCode: 400
      }, { status: 400 });
    }

    const updated = await prisma.sequence_enrollments.update({
      where: { id },
      data: {
        status: 'EXITED',
        exited_at: new Date(),
        exit_reason: `PAUSED: ${reason}`,
      },
      include: {
        sequence: { select: { id: true, name: true } },
        people: { select: { id: true, name: true, email: true } },
        sequence_steps: { orderBy: { step_number: 'asc' } }
      }
    });

    logger.info('Enrollment paused', { id, reason });

    // Build response
    const steps = updated.sequence_steps;
    const result = {
      success: true,
      enrollment: {
        id: updated.id,
        prospectId: updated.contact_id,
        sequenceId: updated.sequence_id,
        status: 'paused',
        currentStep: updated.current_step,
        totalSteps: steps.length,
        startedAt: updated.enrolled_at.toISOString(),
        pausedAt: updated.exited_at?.toISOString(),
        pauseReason: reason,
        metrics: {
          emailsSent: steps.filter(s => s.sent_at).length,
          emailsOpened: steps.filter(s => s.opened_at).length,
          emailsClicked: steps.filter(s => s.clicked_at).length,
          repliesReceived: steps.filter(s => s.replied_at).length,
        }
      }
    };

    return NextResponse.json(result);
  } catch (err) {
    logger.error('Failed to pause enrollment', { id, error: String(err) });
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
      statusCode: 500
    }, { status: 500 });
  }
}
