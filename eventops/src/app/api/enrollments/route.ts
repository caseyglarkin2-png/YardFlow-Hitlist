import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { enrollContact } from '@/lib/outreach/sequence-engine';
import { authServiceOrSession, requireAuth } from '@/lib/auth-service';
import { Prisma } from '@prisma/client';

/**
 * GET /api/enrollments
 * List sequence enrollments with filtering and pagination
 */
export async function GET(req: NextRequest) {
  const { error, response } = await requireAuth(req);
  if (error) return response;

  const { searchParams } = new URL(req.url);
  const prospectId = searchParams.get('prospectId');
  const sequenceId = searchParams.get('sequenceId');
  const status = searchParams.get('status');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

  try {
    const where: Prisma.sequence_enrollmentsWhereInput = {};
    if (prospectId) where.contact_id = prospectId;
    if (sequenceId) where.sequence_id = sequenceId;
    if (status) where.status = status.toUpperCase();

    const enrollments = await prisma.sequence_enrollments.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { enrolled_at: 'desc' },
      include: {
        sequence: { select: { id: true, name: true } },
        people: { select: { id: true, name: true, email: true } },
        sequence_steps: {
          orderBy: { step_number: 'asc' },
          select: {
            status: true,
            sent_at: true,
            opened_at: true,
            clicked_at: true,
            replied_at: true,
          },
        },
      },
    });

    const hasMore = enrollments.length > limit;
    const data = hasMore ? enrollments.slice(0, limit) : enrollments;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    // Transform to GTM-expected format
    const transformed = data.map((e) => {
      const steps = e.sequence_steps;
      return {
        id: e.id,
        prospectId: e.contact_id,
        sequenceId: e.sequence_id,
        status: e.status.toLowerCase(),
        currentStep: e.current_step,
        totalSteps: steps.length,
        startedAt: e.enrolled_at.toISOString(),
        lastStepAt: steps
          .filter((s) => s.sent_at)
          .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime())[0]
          ?.sent_at?.toISOString(),
        pausedAt:
          e.status === 'EXITED' && e.exit_reason?.startsWith('PAUSED:')
            ? e.exited_at?.toISOString()
            : undefined,
        pauseReason: e.exit_reason?.startsWith('PAUSED:')
          ? e.exit_reason.replace('PAUSED: ', '')
          : undefined,
        completedAt: e.completed_at?.toISOString(),
        stoppedAt: e.exited_at?.toISOString(),
        stopReason: e.exit_reason,
        metrics: {
          emailsSent: steps.filter((s) => s.sent_at).length,
          emailsOpened: steps.filter((s) => s.opened_at).length,
          emailsClicked: steps.filter((s) => s.clicked_at).length,
          repliesReceived: steps.filter((s) => s.replied_at).length,
        },
        // Include related data for convenience
        sequence: e.sequence,
        prospect: e.people,
      };
    });

    return NextResponse.json({
      data: transformed,
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    logger.error('Error fetching enrollments', { error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authServiceOrSession(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prospectId, flowId } = body;

    if (!prospectId || !flowId) {
      return NextResponse.json({ error: 'prospectId and flowId are required' }, { status: 400 });
    }

    const result = await enrollContact(flowId, prospectId);

    if (!result.success) {
      // If error is "already enrolled", return 409 Conflict, otherwise 400
      const status = result.error?.includes('already enrolled') ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(
      {
        success: true,
        enrollmentId: result.enrollmentId,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating enrollment', { error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
