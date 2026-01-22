import { NextRequest, NextResponse } from 'next/server';

// TODO: Custom dashboards feature not implemented
// Requires adding customDashboard model to Prisma schema

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Custom dashboards not yet implemented', dashboards: [] },
    { status: 501 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Custom dashboards not yet implemented' },
    { status: 501 }
  );
}
