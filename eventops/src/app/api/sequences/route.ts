import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    const sequences = await prisma.sequences.findMany({
      where: {
        campaigns: { eventId: user.activeEventId },
        ...(campaignId && { campaignId }),
      },
      include: {
        campaigns: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sequences });
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
      select: { id: true, activeEventId: true },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, campaignId, steps } = body;

    if (!name || !steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'Name and steps required' }, { status: 400 });
    }

    // Validate steps format
    for (const step of steps) {
      if (!step.channel || !step.delayDays || typeof step.delayDays !== 'number') {
        return NextResponse.json(
          { error: 'Each step must have channel and delayDays' },
          { status: 400 }
        );
      }
    }

    // Verify campaign belongs to active event
    if (campaignId) {
      const campaign = await prisma.campaigns.findFirst({
        where: { id: campaignId, eventId: user.activeEventId },
      });
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
    }

    const sequence = await prisma.sequences.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description,
        campaignId,
        steps: JSON.stringify(steps),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ sequence }, { status: 201 });
  } catch (error) {
    console.error('Error creating sequence:', error);
    return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
  }
}
