import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ab-tests - Get all AB tests
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth result
    const userId =
      authResult.type === 'session'
        ? authResult.userId
        : req.headers.get('x-user-id') || authResult.userId;

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 400 });
    }

    const tests = await prisma.ab_tests.findMany({
      where: { eventId: user.activeEventId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/ab-tests',
      method: 'GET',
      userId: authResult?.userId,
    });
    console.error('Error fetching AB tests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AB tests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ab-tests - Create a new AB test
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from auth result
    const userId =
      authResult.type === 'session'
        ? authResult.userId
        : req.headers.get('x-user-id') || authResult.userId;

    const user = await prisma.users.findUnique({
      where: { id: userId },
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
  } catch (error) {
    captureRouteError(error, {
      route: '/api/ab-tests',
      method: 'POST',
      userId: authResult?.userId,
    });
    console.error('Error creating AB test:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create AB test' },
      { status: 500 }
    );
  }
}
