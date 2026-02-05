import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

// TODO: Implement webhooks - requires webhooks table in schema
export async function PUT(request: NextRequest, _context: { params: { id: string } }) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Webhooks feature not yet implemented',
    },
    { status: 501 }
  );
}

export async function DELETE(request: NextRequest, _context: { params: { id: string } }) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
