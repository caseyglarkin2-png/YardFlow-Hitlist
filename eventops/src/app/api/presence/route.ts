import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// In-memory presence store (in production, use Redis)
const presenceStore = new Map<
  string,
  { userId: string; userName: string; page: string; lastSeen: Date }
>();

/**
 * GET /api/presence - Get online users
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page');

  // Clean up stale presence (> 2 minutes)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  for (const [key, value] of presenceStore.entries()) {
    if (value.lastSeen < twoMinutesAgo) {
      presenceStore.delete(key);
    }
  }

  // Filter by page if specified
  const presence = Array.from(presenceStore.values()).filter((p) =>
    page ? p.page === page : true
  );

  return NextResponse.json({ presence });
}

/**
 * POST /api/presence - Update user presence (heartbeat)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { page } = await req.json();

  presenceStore.set(user.id, {
    userId: user.id,
    userName: user.name || user.email,
    page,
    lastSeen: new Date(),
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/presence - Remove user presence (logout/close)
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (user) {
    presenceStore.delete(user.id);
  }

  return NextResponse.json({ success: true });
}
