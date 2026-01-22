import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/campaigns
 * List all campaigns for active event
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ campaigns: [] });
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

    return NextResponse.json({ campaigns });
  } catch (error) {
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { activeEventId: true, email: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      description,
      targetPersonas,
      minIcpScore,
      startDate,
      endDate,
      goals,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

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
        createdBy: user.email || session.user.id,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
