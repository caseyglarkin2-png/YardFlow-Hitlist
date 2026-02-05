import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Create notification
 */
export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, type, title, message, actionUrl, priority } = await req.json();

  const notification = await prisma.notifications.create({
    data: {
      userId: userId || authResult.userId,
      type: type || 'INFO',
      title,
      message,
      read: false,
      metadata: { actionUrl, priority: priority || 'NORMAL' },
    },
  });

  return NextResponse.json(notification);
}

/**
 * Get notifications for user
 */
export async function GET(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');

  const notifications = await prisma.notifications.findMany({
    where: {
      userId: authResult.userId,
      ...(unreadOnly && { read: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({
    notifications,
    unreadCount: await prisma.notifications.count({
      where: { userId: authResult.userId, read: false },
    }),
  });
}
