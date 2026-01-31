import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// TODO: Implement webhooks - requires webhooks table in schema
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: false,
    error: 'Webhooks feature not yet implemented'
  }, { status: 501 });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
