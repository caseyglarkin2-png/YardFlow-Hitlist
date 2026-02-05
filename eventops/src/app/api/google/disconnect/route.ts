import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { disconnectGoogle } from '@/lib/google/auth';
import { prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authResult = await authServiceOrSession(req);

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await disconnectGoogle(authResult.userId);

    // Log disconnection
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        userId: authResult.userId,
        entityType: 'integration',
        entityId: 'google',
        action: 'google_disconnected',
        metadata: {
          disconnectedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/google/disconnect',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Disconnect failed' },
      { status: 500 }
    );
  }
}
