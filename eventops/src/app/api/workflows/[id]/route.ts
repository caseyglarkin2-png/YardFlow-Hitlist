import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

// TODO: Implement workflows - requires workflows table in schema
export async function GET(request: NextRequest, _context: { params: { id: string } }) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Workflows feature not yet implemented',
    },
    { status: 501 }
  );
}

export async function PUT(request: NextRequest, _context: { params: { id: string } }) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Workflows feature not yet implemented',
    },
    { status: 501 }
  );
}

export async function DELETE(request: NextRequest, _context: { params: { id: string } }) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Workflows feature not yet implemented',
    },
    { status: 501 }
  );
}
