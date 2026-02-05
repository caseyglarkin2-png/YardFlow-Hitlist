import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    const updates: { updatedAt: Date; googleSyncPaused?: boolean; googleSyncDryRun?: boolean } = {
      updatedAt: new Date(),
    };

    switch (action) {
      case 'pause':
        updates.googleSyncPaused = true;
        break;
      case 'resume':
        updates.googleSyncPaused = false;
        break;
      case 'dry-run':
        updates.googleSyncDryRun = true;
        break;
      case 'live':
        updates.googleSyncDryRun = false;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: pause, resume, dry-run, or live' },
          { status: 400 }
        );
    }

    const user = await prisma.users.update({
      where: { id: authResult.userId },
      data: updates,
      select: {
        googleSyncPaused: true,
        googleSyncDryRun: true,
      },
    });

    return NextResponse.json({
      success: true,
      googleSyncPaused: user.googleSyncPaused,
      googleSyncDryRun: user.googleSyncDryRun,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/google/sync/control',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Sync control error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Control action failed' },
      { status: 500 }
    );
  }
}
