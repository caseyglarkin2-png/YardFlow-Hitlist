import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await prisma.outreach.update({
      where: { id: params.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentBy: authResult.email || authResult.userId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/outreach/[id]/mark-sent',
      method: 'POST',
    });
    console.error('Error marking as sent:', error);
    return NextResponse.json({ error: 'Failed to mark as sent' }, { status: 500 });
  }
}
