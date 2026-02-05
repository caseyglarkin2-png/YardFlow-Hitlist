import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authServiceOrSession(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await prisma.score_history.findMany({
      where: { accountId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ history });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/accounts/[id]/score-history',
      method: 'GET',
      userId: authResult?.userId,
    });
    console.error('Error fetching score history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
