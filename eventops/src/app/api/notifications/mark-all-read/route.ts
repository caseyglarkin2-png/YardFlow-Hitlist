import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Mark all notifications as read
 */
export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await prisma.notifications.updateMany({
    where: {
      userId: authResult.userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return NextResponse.json({
    success: true,
    updated: result.count,
  });
}
