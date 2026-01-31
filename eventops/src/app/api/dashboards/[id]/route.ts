import { NextRequest, NextResponse } from 'next/server';

// TODO: Custom dashboards feature not implemented
// Requires adding customDashboard model to Prisma schema

export async function PATCH(
  _request: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  return NextResponse.json({ error: 'Custom dashboards not yet implemented' }, { status: 501 });
}

export async function DELETE(
  _request: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  return NextResponse.json({ error: 'Custom dashboards not yet implemented' }, { status: 501 });
}
