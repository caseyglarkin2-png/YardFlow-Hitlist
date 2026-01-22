import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/db';

// TODO: Implement webhooks - requires webhooks table in schema
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({
    success: false,
    error: 'Webhooks feature not yet implemented'
  }, { status: 501 });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ success: true });
}
