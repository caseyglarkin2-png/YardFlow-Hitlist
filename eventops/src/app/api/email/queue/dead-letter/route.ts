import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/queue/dead-letter
 * List failed emails for retry/inspection
 */
export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

    // Get failed sequence steps (our email send attempts)
    const failedSteps = await prisma.sequence_steps.findMany({
      where: { status: 'FAILED' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { updatedAt: 'desc' },
      include: {
        enrollment: {
          include: {
            people: { select: { id: true, name: true, email: true } },
            sequence: { select: { id: true, name: true } },
          },
        },
      },
    });

    const hasMore = failedSteps.length > limit;
    const data = hasMore ? failedSteps.slice(0, limit) : failedSteps;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    // Transform to expected format
    const deadLetterItems = data.map((step) => ({
      id: step.id,
      prospectId: step.enrollment.contact_id,
      prospectEmail: step.enrollment.people?.email || 'unknown',
      sequenceId: step.enrollment.sequence_id,
      enrollmentId: step.enrollment_id,
      stepNumber: step.step_number,
      subject: `Step ${step.step_number} - ${step.template_type}`,
      error: step.error_message || 'Unknown error',
      failedAt: step.updatedAt.toISOString(),
      attempts: 1, // Would need retry tracking
      lastAttemptAt: step.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data: deadLetterItems,
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (err) {
    logger.error('Failed to get dead letter queue', { error: String(err) });
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
