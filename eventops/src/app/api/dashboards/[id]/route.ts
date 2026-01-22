import { NextRequest, NextResponse } from 'next/server';

// TODO: Custom dashboards feature not implemented
// Requires adding customDashboard model to Prisma schema

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: 'Custom dashboards not yet implemented' },
    { status: 501 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: 'Custom dashboards not yet implemented' },
    { status: 501 }
  );
}
