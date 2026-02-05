import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

// TODO: Implement webhooks - requires webhooks table in schema
// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
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

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json([]);
}
