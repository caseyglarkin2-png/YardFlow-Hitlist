import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { db as prisma } from '@/lib/db';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/heatmap - Get engagement heatmap data
 */
export async function GET(req: NextRequest) {
  const authResult = await authServiceOrSession(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { id: authResult.userId },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const metric = searchParams.get('metric') || 'opens';
  const persona = searchParams.get('persona') || 'all';

  try {
    // Get all outreach for the event
    const outreach = await prisma.outreach.findMany({
      where: {
        people: {
          target_accounts: {
            eventId: user.activeEventId,
          },
          ...(persona !== 'all' && {
            [`is${persona.charAt(0)}${persona.slice(1).toLowerCase()}`]: true,
          }),
        },
        status: { in: ['SENT', 'OPENED', 'RESPONDED'] },
      },
      select: {
        openedAt: true,
        sentAt: true,
        respondedAt: true,
      },
    });

    // Build heatmap data
    const heatmap: Map<string, { count: number; total: number }> = new Map();

    outreach.forEach((item) => {
      let timestamp: Date | null = null;

      if (metric === 'opens' && item.openedAt) {
        timestamp = new Date(item.openedAt);
      } else if (metric === 'replies' && item.respondedAt) {
        timestamp = new Date(item.respondedAt);
      } else if (metric === 'clicks' && item.openedAt) {
        // For now, use openedAt as proxy for clicks
        // TODO: Add clickedAt field to outreach model
        timestamp = new Date(item.openedAt);
      }

      if (!timestamp) return;

      const day = timestamp.getDay();
      const hour = timestamp.getHours();
      const key = `${day}-${hour}`;

      const current = heatmap.get(key) || { count: 0, total: 0 };
      current.count += 1;
      heatmap.set(key, current);
    });

    // Convert to array format
    const data = Array.from(heatmap.entries()).map(([key, value]) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        day,
        hour,
        count: value.count,
        rate: value.count, // Rate would be (count / total sent at that time) * 100
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/analytics/heatmap',
      method: 'GET',
      userId: authResult?.userId,
    });
    console.error('Heatmap error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Heatmap generation failed' },
      { status: 500 }
    );
  }
}
