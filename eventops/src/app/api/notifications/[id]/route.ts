import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Mark notification as read
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notification = await prisma.notifications.update({
    where: {
      id: params.id,
      userId: authResult.userId,
    },
    data: { read: true },
  });

  return NextResponse.json(notification);
}

/**
 * Delete notification
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.notifications.delete({
    where: {
      id: params.id,
      userId: authResult.userId,
    },
  });

  return NextResponse.json({ success: true });
}
