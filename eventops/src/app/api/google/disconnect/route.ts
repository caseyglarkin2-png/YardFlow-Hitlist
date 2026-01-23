import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { disconnectGoogle } from '@/lib/google/auth';
import { prisma } from '@/lib/db';

export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await disconnectGoogle(session.user.id);

    // Log disconnection
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        entityType: 'integration',
        entityId: 'google',
        action: 'google_disconnected',
        metadata: {
          disconnectedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Disconnect failed' },
      { status: 500 }
    );
  }
}
