import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ab-tests/[id] - Get specific AB test
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
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
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
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
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { variant, event } = await req.json(); // variant: 'A' | 'B', event: 'sent' | 'opened' | 'clicked' | 'replied'

  const test = await prisma.ab_tests.findUnique({
    where: { id: params.id },
  });

  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  interface VariantResult {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    [key: string]: number; // Allow indexing with event string
  }

  interface TestResults {
    variantA: VariantResult;
    variantB: VariantResult;
    [key: string]: VariantResult;
  }

  const results = (test.results as unknown as TestResults) || {
    variantA: { sent: 0, opened: 0, clicked: 0, replied: 0 },
    variantB: { sent: 0, opened: 0, clicked: 0, replied: 0 },
  };

  const key = variant === 'A' ? 'variantA' : 'variantB';
  results[key][event as string] = (results[key][event as string] || 0) + 1;

  // Check if we should declare a winner
  let winnerId = null;
  if (
    results.variantA.sent >= test.sampleSize / 2 &&
    results.variantB.sent >= test.sampleSize / 2
  ) {
    const aRate = results.variantA.opened / results.variantA.sent;
    const bRate = results.variantB.opened / results.variantB.sent;

    // Simple winner determination (in production, use statistical significance test)
    if (Math.abs(aRate - bRate) > 0.1) {
      // 10% difference
      winnerId = aRate > bRate ? test.templateAId : test.templateBId;
    }
  }

  const updated = await prisma.ab_tests.update({
    where: { id: params.id },
    data: {
      results: results as unknown as Parameters<
        typeof prisma.ab_tests.update
      >[0]['data']['results'],
      ...(winnerId && { winnerId, status: 'COMPLETED', completedAt: new Date() }),
    },
  });

  return NextResponse.json({ test: updated });
}
