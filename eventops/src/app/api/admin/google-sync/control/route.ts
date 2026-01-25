import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { setGlobalSyncEnabled, getGlobalSyncEnabled } from '@/lib/google/sync-state';

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.email?.endsWith('@freightroll.com')) {
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

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.email?.endsWith('@freightroll.com')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return NextResponse.json({
    globalSyncEnabled: getGlobalSyncEnabled(),
  });
}
