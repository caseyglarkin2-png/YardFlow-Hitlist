import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    const updates: any = {
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
      where: { id: session.user.id },
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
  } catch (error: any) {
    console.error('Sync control error:', error);
    return NextResponse.json(
      { error: error.message || 'Control action failed' },
      { status: 500 }
    );
  }
}
