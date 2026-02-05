import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      await prisma.notifications.updateMany({
        where: {
          userId: authResult.userId,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({ success: true, markedAll: true });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Missing notificationIds' },
        { status: 400 }
      );
    }

    await prisma.notifications.updateMany({
      where: {
        id: { in: notificationIds },
        userId: authResult.userId,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: notificationIds.length,
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
