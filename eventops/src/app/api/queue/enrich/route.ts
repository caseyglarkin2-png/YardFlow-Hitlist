import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobType, accountId, limit, force } = body;

    // Validate job type
    if (!['email-pattern', 'linkedin-enrichment', 'generate-emails'].includes(jobType)) {
      return NextResponse.json(
        { error: 'Invalid job type' },
        { status: 400 }
      );
    }

    // Validate accountId
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Import queue function dynamically to avoid Redis connection during build
    const { addEnrichmentJob } = await import('@/lib/queue/queues');

    let job;
    switch (jobType) {
      case 'email-pattern':
        job = await addEnrichmentJob('email-pattern', {
          accountId,
          userId: session.user.id,
        });
        break;

      case 'linkedin-enrichment':
        job = await addEnrichmentJob('linkedin-enrichment', {
          accountId,
          limit: limit || 50,
          userId: session.user.id,
        });
        break;

      case 'generate-emails':
        job = await addEnrichmentJob('generate-emails', {
          accountId,
          force: force || false,
          userId: session.user.id,
        });
        break;
    }

    logger.info('Enrichment job queued', {
      jobType,
      accountId,
      jobId: job.id,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      jobType,
      accountId,
      queuedAt: new Date(),
    });
  } catch (error: any) {
    logger.error('Error queuing enrichment job', { error });
    return NextResponse.json(
      { error: 'Failed to queue job' },
      { status: 500 }
    );
  }
}
