import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { agentQueue } from '@/lib/queue/queues';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const triggerSchema = z.object({
  action: z.enum([
    'start-campaign',
    'run-prospecting',
    'run-research',
    'run-content',
    'run-graphics',
    'run-socials',
    'run-contracting',
  ]),
  params: z.record(z.any()),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = triggerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { action, params } = validated.data;

    logger.info('Triggering agent action manually', {
      userId: session.user.id,
      action,
      params,
    });

    const job = await agentQueue.add(action, {
      action,
      params,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Agent action '${action}' triggered successfully`,
    });
  } catch (error) {
    logger.error('Failed to trigger agent', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
