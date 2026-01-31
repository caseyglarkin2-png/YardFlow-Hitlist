import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/events
 * Get email tracking events (opens, clicks, etc.)
 */
export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const prospectId = searchParams.get('prospectId');
    const event = searchParams.get('event');
    const since = searchParams.get('since');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (emailId) {
      where.sequenceStepId = emailId;
    }

    if (event) {
      where.eventType = event.toUpperCase();
    }

    if (since) {
      where.timestamp = { gte: new Date(since) };
    }

    // If prospectId provided, join through sequence_steps -> enrollment -> people
    if (prospectId) {
      where.sequenceStep = {
        enrollment: {
          contact_id: prospectId,
        },
      };
    }

    const events = await prisma.email_engagement.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { timestamp: 'desc' },
      include: {
        sequenceStep: {
          select: {
            id: true,
            enrollment: {
              select: {
                contact_id: true,
              },
            },
          },
        },
      },
    });

    const hasMore = events.length > limit;
    const data = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    // Transform to expected format
    const transformed = data.map((e) => ({
      id: e.id,
      emailId: e.sequenceStepId,
      prospectId: e.sequenceStep?.enrollment?.contact_id,
      event: e.eventType.toLowerCase(),
      timestamp: e.timestamp.toISOString(),
      metadata: e.metadata as Record<string, unknown> | undefined,
    }));

    return NextResponse.json({
      data: transformed,
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (err) {
    logger.error('Failed to get email events', { error: String(err) });
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
