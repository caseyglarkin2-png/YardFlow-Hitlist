import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { setGlobalSyncEnabled, getGlobalSyncEnabled } from '@/lib/google/sync-state';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin check: verify email domain
  let email = authResult.email;
  if (!email) {
    const user = await prisma.users.findUnique({
      where: { id: authResult.userId },
      select: { email: true },
    });
    email = user?.email || undefined;
  }

  if (!email?.endsWith('@freightroll.com')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { action } = await request.json();

  if (action === 'enable') {
    setGlobalSyncEnabled(true);
  } else if (action === 'disable') {
    setGlobalSyncEnabled(false);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    globalSyncEnabled: getGlobalSyncEnabled(),
  });
}

export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin check: verify email domain
  let email = authResult.email;
  if (!email) {
    const user = await prisma.users.findUnique({
      where: { id: authResult.userId },
      select: { email: true },
    });
    email = user?.email || undefined;
  }

  if (!email?.endsWith('@freightroll.com')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return NextResponse.json({
    globalSyncEnabled: getGlobalSyncEnabled(),
  });
}
