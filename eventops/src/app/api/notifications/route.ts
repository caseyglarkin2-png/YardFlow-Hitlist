import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Create notification
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, type, title, message, actionUrl, priority } = await req.json();

  const notification = await prisma.notification.create({
    data: {
      userId: userId || session.user.id,
      type: type || 'INFO',
      title,
      message,
      actionUrl,
      priority: priority || 'NORMAL',
      read: false,
    },
  });

  return NextResponse.json(notification);
}

/**
 * Get notifications for user
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly && { read: false }),
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({
    notifications,
    unreadCount: await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  });
}
