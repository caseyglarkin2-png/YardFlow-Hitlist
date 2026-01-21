import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/presence - Update user presence
export async function POST(request: NextRequest) {
  try {
    const { userId, page, status } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Store presence in database (expires after 5 minutes)
    const presence = await prisma.userPresence.upsert({
      where: { userId },
      update: {
        page,
        status: status || 'active',
        lastSeen: new Date(),
      },
      create: {
        userId,
        page,
        status: status || 'active',
        lastSeen: new Date(),
      },
    });

    return NextResponse.json(presence);
  } catch (error) {
    console.error('Error updating presence:', error);
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    );
  }
}

// GET /api/presence - Get active users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');

    // Get presences updated in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const presences = await prisma.userPresence.findMany({
      where: {
        lastSeen: { gte: fiveMinutesAgo },
        ...(page && { page }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { lastSeen: 'desc' },
    });

    return NextResponse.json(presences);
  } catch (error) {
    console.error('Error fetching presence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presence' },
      { status: 500 }
    );
  }
}
