/**
 * Outreach CRUD API
 * POST /api/outreach - Create a new outreach record
 * GET /api/outreach - List outreach records
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';
import { OutreachChannel, OutreachStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const CreateOutreachSchema = z.object({
  personId: z.string().min(1, 'personId is required'),
  channel: z.enum(['EMAIL', 'LINKEDIN', 'PHONE']).default('EMAIL'),
  subject: z.string().optional(),
  message: z.string().min(1, 'message is required'),
  templateId: z.string().optional(),
  status: z
    .enum(['DRAFT', 'SCHEDULED', 'SENT', 'OPENED', 'CLICKED', 'RESPONDED', 'BOUNCED'])
    .optional(),
});

/**
 * POST /api/outreach
 * Create a new outreach record
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      logger.warn('[outreach] Unauthorized POST attempt', { requestId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = CreateOutreachSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json({ error: 'Validation failed', details }, { status: 400 });
    }

    const { personId, channel, subject, message, templateId, status } = parsed.data;

    // Verify person exists
    const person = await prisma.people.findUnique({
      where: { id: personId },
      select: { id: true, name: true, email: true, accountId: true },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Get userId for sentBy field
    const userId =
      authResult.type === 'session'
        ? authResult.userId
        : req.headers.get('x-user-id') || authResult.userId;

    // Create outreach record
    const outreach = await prisma.outreach.create({
      data: {
        id: crypto.randomUUID(),
        personId,
        channel: channel as OutreachChannel,
        subject: subject || null,
        message,
        templateId: templateId || null,
        status: (status as OutreachStatus) || OutreachStatus.DRAFT,
        sentBy: userId,
        updatedAt: new Date(),
      },
    });

    logger.info('[outreach] Created outreach record', {
      requestId,
      outreachId: outreach.id,
      personId,
      channel,
    });

    return NextResponse.json(outreach, { status: 201 });
  } catch (error) {
    captureRouteError(error, { route: '/api/outreach', method: 'POST', extras: { requestId } });
    logger.error('[outreach] Failed to create outreach', { requestId, error });
    return NextResponse.json(
      {
        error: 'Failed to create outreach',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/outreach
 * List outreach records with filtering
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const personId = searchParams.get('personId');
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const skip = parseInt(searchParams.get('skip') || '0');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (personId) where.personId = personId;
    if (status) where.status = status.toUpperCase();
    if (channel) where.channel = channel.toUpperCase();

    const [outreach, total] = await Promise.all([
      prisma.outreach.findMany({
        where,
        include: {
          people: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.outreach.count({ where }),
    ]);

    return NextResponse.json({
      data: outreach,
      pagination: { limit, skip, total, hasMore: outreach.length === limit },
    });
  } catch (error) {
    captureRouteError(error, { route: '/api/outreach', method: 'GET' });
    logger.error('[outreach] Failed to list outreach', { error });
    return NextResponse.json({ error: 'Failed to list outreach' }, { status: 500 });
  }
}
