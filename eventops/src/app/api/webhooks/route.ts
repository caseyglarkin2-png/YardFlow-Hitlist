import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/db';

// TODO: Implement webhooks - requires webhooks table in schema
// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Webhooks feature not yet implemented'
  }, { status: 501 });
}

// GET /api/webhooks - List webhooks
export async function GET() {
  return NextResponse.json([]);
}
