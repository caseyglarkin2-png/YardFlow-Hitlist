import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ab-tests - Get all AB tests
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const tests = await prisma.ab_tests.findMany({
    where: { eventId: user.activeEventId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ tests });
}

/**
 * POST /api/ab-tests - Create a new AB test
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const { name, description, templateAId, templateBId, sampleSize, winnerThreshold } =
    await req.json();

  if (!name || !templateAId || !templateBId) {
    return NextResponse.json(
      { error: 'Name, templateAId, and templateBId are required' },
      { status: 400 }
    );
  }

  const test = await prisma.ab_tests.create({
    data: {
      name,
      description,
      templateAId,
      templateBId,
      sampleSize: sampleSize || 100,
      winnerThreshold: winnerThreshold || 0.05,
      createdBy: user.id,
      eventId: user.activeEventId,
      results: {
        variantA: { sent: 0, opened: 0, clicked: 0, replied: 0 },
        variantB: { sent: 0, opened: 0, clicked: 0, replied: 0 },
      },
    },
  });

  return NextResponse.json({ test }, { status: 201 });
}
