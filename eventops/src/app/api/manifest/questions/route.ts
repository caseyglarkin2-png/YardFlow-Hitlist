import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateStrategicQuestions } from '@/lib/manifest/strategic-questions';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing required field: accountId' },
        { status: 400 }
      );
    }

    // Generate strategic questions
    const result = await generateStrategicQuestions(accountId);
    
    logger.info('Strategic questions generated via API', {
      userId: session.user.id,
      accountId,
      questionCount: result.questions.length,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Strategic questions generation failed', { 
      error,
      userId: session.user?.id,
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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing required parameter: accountId' },
        { status: 400 }
      );
    }

    // Fetch existing strategic questions from database
    const account = await prisma.target_accounts.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        strategic_questions: true,
        updated_at: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.strategic_questions) {
      return NextResponse.json(
        { 
          error: 'No strategic questions found. Generate them first using POST.',
          accountId: account.id,
          companyName: account.name,
        },
        { status: 404 }
      );
    }

    const questions = JSON.parse(account.strategic_questions as string);
    
    return NextResponse.json({
      accountId: account.id,
      companyName: account.name,
      questions,
      generatedAt: account.updated_at.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch strategic questions', { 
      error,
      userId: session.user?.id,
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch strategic questions' },
      { status: 500 }
    );
  }
}
