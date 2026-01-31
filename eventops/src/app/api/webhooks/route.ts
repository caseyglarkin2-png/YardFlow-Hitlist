import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// TODO: Implement webhooks - requires webhooks table in schema
// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: false,
    error: 'Webhooks feature not yet implemented'
  }, { status: 501 });
}

// GET /api/webhooks - List webhooks
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json([]);
}
