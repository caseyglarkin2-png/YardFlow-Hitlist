import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

// TODO: Custom dashboards feature not implemented
// Requires adding customDashboard model to Prisma schema

export async function PATCH(
  request: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Custom dashboards not yet implemented' }, { status: 501 });
}

export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Custom dashboards not yet implemented' }, { status: 501 });
}
