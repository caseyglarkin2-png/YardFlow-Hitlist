import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Get all meetings for the active event
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const meetings = await prisma.meeting.findMany({
    where: {
      person: {
        account: {
          eventId: user.activeEventId,
        },
      },
      ...(status && { status }),
      ...(startDate && {
        scheduledAt: {
          gte: new Date(startDate),
        },
      }),
      ...(endDate && {
        scheduledAt: {
          lte: new Date(endDate),
        },
      }),
    },
    include: {
      person: {
        include: {
          account: true,
        },
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  return NextResponse.json(meetings);
}

/**
 * Create a new meeting
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  const {
    personId,
    scheduledAt,
    duration,
    location,
    meetingType,
    notes,
  } = data;

  if (!personId || !scheduledAt) {
    return NextResponse.json(
      { error: 'personId and scheduledAt are required' },
      { status: 400 }
    );
  }

  const meeting = await prisma.meeting.create({
    data: {
      personId,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 30,
      location,
      meetingType,
      notes,
      createdBy: session.user.id,
    },
    include: {
      person: {
        include: {
          account: true,
        },
      },
    },
  });

  return NextResponse.json(meeting);
}
