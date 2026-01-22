import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

// GET /api/activity/stream - Get activity stream
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Filter by user
    const entityType = searchParams.get('entityType'); // Filter by entity type
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    const [activities, total] = await Promise.all([
      prisma.activities.findMany({
        where,
        include: {
          users: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.activities.count({ where }),
    ]);

    return NextResponse.json({
      activities,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching activity stream:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity stream' },
      { status: 500 }
    );
  }
}
