import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/db';

// TODO: Implement workflows - requires workflows table in schema
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({
    success: false,
    error: 'Workflows feature not yet implemented'
  }, { status: 501 });
}
