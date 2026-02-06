import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { generateStrategicQuestions } from '@/lib/manifest/strategic-questions';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Missing required field: accountId' }, { status: 400 });
    }

    // Generate strategic questions
    const result = await generateStrategicQuestions(accountId);

    logger.info('Strategic questions generated via API', {
      userId: authResult.userId,
      accountId,
      questionCount: result.questions.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    captureRouteError(error, {
      route: '/api/manifest/questions',
      method: 'POST',
    });
    logger.error('Strategic questions generation failed', {
      error,
      userId: authResult.userId,
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to generate strategic questions',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Missing required parameter: accountId' }, { status: 400 });
    }

    // Fetch existing strategic questions from database
    const account = await prisma.target_accounts.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Strategic questions are no longer stored in database
    // Always regenerate using AI
    return NextResponse.json(
      {
        error: 'No strategic questions found. Generate them first using POST.',
        accountId: account.id,
        companyName: account.name,
      },
      { status: 404 }
    );
  } catch (error) {
    captureRouteError(error, {
      route: '/api/manifest/questions',
      method: 'GET',
    });
    logger.error('Failed to fetch strategic questions', {
      error,
      userId: authResult.userId,
    });

    return NextResponse.json({ error: 'Failed to fetch strategic questions' }, { status: 500 });
  }
}
