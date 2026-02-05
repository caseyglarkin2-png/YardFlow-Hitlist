import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';
import { enrollContact } from '@/lib/outreach/sequence-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const authResult = await authServiceOrSession(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { personIds, accountIds } = body;

    // Find sequence without createdBy filter - team members should access all sequences
    const sequence = await prisma.outreachSequence.findUnique({
      where: { id },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    if (sequence.status !== 'active') {
      return NextResponse.json(
        { error: 'Sequence must be active to enroll contacts' },
        { status: 400 }
      );
    }

    let allPersonIds: string[] = [];

    if (personIds && Array.isArray(personIds)) {
      allPersonIds.push(...personIds);
    }

    if (accountIds && Array.isArray(accountIds)) {
      const peopleFromAccounts = await prisma.people.findMany({
        where: {
          accountId: { in: accountIds },
        },
        select: { id: true },
      });

      allPersonIds.push(...peopleFromAccounts.map((p) => p.id));
    }

    if (allPersonIds.length === 0) {
      return NextResponse.json({ error: 'No contacts specified for enrollment' }, { status: 400 });
    }

    allPersonIds = [...new Set(allPersonIds)];

    const results = {
      enrolled: [] as string[],
      skipped: [] as { personId: string; reason: string }[],
    };

    for (const personId of allPersonIds) {
      const result = await enrollContact(id, personId);

      if (result.success) {
        results.enrolled.push(personId);
      } else {
        results.skipped.push({
          personId,
          reason: result.error || 'Unknown error',
        });
      }
    }

    logger.info('Bulk enrollment completed', {
      sequenceId: id,
      userId: authResult.userId,
      userEmail: authResult.email,
      enrolledCount: results.enrolled.length,
      skippedCount: results.skipped.length,
    });

    return NextResponse.json({
      success: true,
      enrolledCount: results.enrolled.length,
      skippedCount: results.skipped.length,
      enrolled: results.enrolled,
      skipped: results.skipped,
    });
  } catch (error) {
    captureRouteError(error, { route: '/api/sequences/[id]/enroll', method: 'POST', extras: { sequenceId: id } });
    logger.error('Error enrolling contacts', { sequenceId: id, error });
    return NextResponse.json({ error: 'Failed to enroll contacts' }, { status: 500 });
  }
}
