import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { enrollContact } from '@/lib/outreach/sequence-engine';
import { authServiceOrSession } from '@/lib/auth-service';

export async function GET(req: NextRequest) {
  try {
    const auth = await authServiceOrSession(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const prospectId = searchParams.get('prospectId');

    if (!prospectId) {
      return NextResponse.json(
        { error: 'prospectId is required' },
        { status: 400 }
      );
    }

    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        personId: prospectId,
      },
      include: {
        sequence: {
            select: {
                id: true,
                name: true
            }
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return NextResponse.json({ enrollments });
  } catch (error) {
    logger.error('Error fetching enrollments', { error });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authServiceOrSession(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prospectId, flowId } = body;

    if (!prospectId || !flowId) {
      return NextResponse.json(
        { error: 'prospectId and flowId are required' },
        { status: 400 }
      );
    }

    const result = await enrollContact(flowId, prospectId);

    if (!result.success) {
        // If error is "already enrolled", return 409 Conflict, otherwise 400
        const status = result.error?.includes('already enrolled') ? 409 : 400;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
        success: true,
        enrollmentId: result.enrollmentId
    }, { status: 201 });

  } catch (error) {
    logger.error('Error creating enrollment', { error });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
