import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ab-tests/[id] - Get specific AB test
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const test = await prisma.ab_tests.findUnique({
    where: { id: params.id },
  });

  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  return NextResponse.json({ test });
}

/**
 * PUT /api/ab-tests/[id] - Update AB test (stop, complete, etc.)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { status, winnerId } = await req.json();

  const updated = await prisma.ab_tests.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(winnerId && { winnerId }),
      ...(status === 'COMPLETED' && { completedAt: new Date() }),
    },
  });

  return NextResponse.json({ test: updated });
}

/**
 * POST /api/ab-tests/[id]/results - Record test results
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { variant, event } = await req.json(); // variant: 'A' | 'B', event: 'sent' | 'opened' | 'clicked' | 'replied'

  const test = await prisma.ab_tests.findUnique({
    where: { id: params.id },
  });

  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  const results: any = test.results || {
    variantA: { sent: 0, opened: 0, clicked: 0, replied: 0 },
    variantB: { sent: 0, opened: 0, clicked: 0, replied: 0 },
  };

  const key = variant === 'A' ? 'variantA' : 'variantB';
  results[key][event] = (results[key][event] || 0) + 1;

  // Check if we should declare a winner
  let winnerId = null;
  if (results.variantA.sent >= test.sampleSize / 2 && results.variantB.sent >= test.sampleSize / 2) {
    const aRate = results.variantA.opened / results.variantA.sent;
    const bRate = results.variantB.opened / results.variantB.sent;
    
    // Simple winner determination (in production, use statistical significance test)
    if (Math.abs(aRate - bRate) > 0.1) { // 10% difference
      winnerId = aRate > bRate ? test.templateAId : test.templateBId;
    }
  }

  const updated = await prisma.ab_tests.update({
    where: { id: params.id },
    data: {
      results,
      ...(winnerId && { winnerId, status: 'COMPLETED', completedAt: new Date() }),
    },
  });

  return NextResponse.json({ test: updated });
}
