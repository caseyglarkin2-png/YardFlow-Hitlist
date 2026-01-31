import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/db';

// TODO: Implement workflows - requires workflows table in schema
export async function GET(_request: NextRequest, _context: { params: { id: string } }) {
  return NextResponse.json(
    {
      success: false,
      error: 'Workflows feature not yet implemented',
    },
    { status: 501 }
  );
}

export async function PUT(_request: NextRequest, _context: { params: { id: string } }) {
  return NextResponse.json(
    {
      success: false,
      error: 'Workflows feature not yet implemented',
    },
    { status: 501 }
  );
}

export async function DELETE(_request: NextRequest, _context: { params: { id: string } }) {
  return NextResponse.json({ success: true });
}
