import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Toggle workflow enabled/disabled
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { enabled } = await req.json();

  const workflow = await prisma.workflow.update({
    where: { id: params.id },
    data: { enabled },
  });

  return NextResponse.json(workflow);
}

/**
 * Delete workflow
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.workflow.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
