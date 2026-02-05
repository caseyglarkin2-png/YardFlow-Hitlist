import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Auth check
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Fetch Root Task with Children
  try {
    const rootTask = await prisma.agent_tasks.findUnique({
      where: { id: params.id },
      include: {
        childTasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!rootTask) {
      return new NextResponse('Campaign/Task not found', { status: 404 });
    }

    // 3. Format Response
    return NextResponse.json({
      id: rootTask.id,
      status: rootTask.status,
      // Default to 100 if completed, else use stored progress
      progress: rootTask.status === 'completed' ? 100 : rootTask.progress || 0,
      tasks: rootTask.childTasks.map((t) => ({
        id: t.id,
        type: t.agentType,
        status: t.status,
        progress: t.status === 'completed' ? 100 : t.progress || 0,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        error: t.errorMessage,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch campaign status', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
