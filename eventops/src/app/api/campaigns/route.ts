import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { parseBody } from '@/lib/validation';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional(),
  targetPersonas: z.array(z.string()).optional(),
  minIcpScore: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  goals: z.record(z.unknown()).optional(),
});

/**
 * GET /api/campaigns
 * List all campaigns for active event
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      authResult.type === 'session'
        ? authResult.userId
        : req.headers.get('x-user-id') || authResult.userId;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ data: [] });
    }

    const campaigns = await prisma.campaigns.findMany({
      where: { eventId: user.activeEventId },
      include: {
        _count: {
          select: {
            outreach: true,
            sequences: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: campaigns });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/campaigns',
      method: 'GET',
    });
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

/**
 * POST /api/campaigns
 * Create new campaign
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      authResult.type === 'session'
        ? authResult.userId
        : req.headers.get('x-user-id') || authResult.userId;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { activeEventId: true, email: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 400 });
    }

    const body = await parseBody(req, CreateCampaignSchema);
    if (!body.success) return body.response;
    const { name, description, targetPersonas, minIcpScore, startDate, endDate, goals } = body.data;

    const campaign = await prisma.campaigns.create({
      data: {
        id: `camp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventId: user.activeEventId,
        name,
        description: description || null,
        targetPersonas: targetPersonas ? JSON.stringify(targetPersonas) : null,
        minIcpScore: minIcpScore || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        goals: goals ? JSON.stringify(goals) : null,
        createdBy: user.email || authResult.userId,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/campaigns',
      method: 'POST',
    });
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
