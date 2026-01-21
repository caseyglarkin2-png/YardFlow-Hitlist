import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Create workflow automation rule
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, trigger, conditions, actions, enabled } = await req.json();

  const workflow = await prisma.workflow.create({
    data: {
      name,
      trigger: JSON.stringify(trigger),
      conditions: JSON.stringify(conditions),
      actions: JSON.stringify(actions),
      enabled: enabled !== false,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(workflow);
}

/**
 * List workflows
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const enabled = searchParams.get('enabled');

  const workflows = await prisma.workflow.findMany({
    where: {
      ...(enabled !== null && { enabled: enabled === 'true' }),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ workflows });
}
