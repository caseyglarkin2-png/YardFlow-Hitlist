import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

interface DailyStats {
  date: string;
  sent: number;
  opened: number;
  responded: number;
  bounced: number;
}

/**
 * GET /api/dashboards/email
 *
 * Returns email metrics formatted for dashboard visualization.
 * Includes daily trends, top performers, and engagement summary.
 */
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily send counts
    const dailyStatsRaw = await prisma.$queryRaw<
      Array<{ date: Date; status: string; count: bigint }>
    >(Prisma.sql`
      SELECT 
        DATE("sentAt") as date,
        status,
        COUNT(*) as count
      FROM outreach
      WHERE "sentAt" >= ${startDate}
        AND "sentAt" IS NOT NULL
      GROUP BY DATE("sentAt"), status
      ORDER BY date DESC
    `);

    // Aggregate by date
    const dailyMap = new Map<string, DailyStats>();
    for (const row of dailyStatsRaw) {
      const dateStr = row.date.toISOString().split('T')[0];
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { date: dateStr, sent: 0, opened: 0, responded: 0, bounced: 0 });
      }
      const stats = dailyMap.get(dateStr)!;
      const count = Number(row.count);

      if (row.status === 'SENT') stats.sent += count;
      if (row.status === 'OPENED') stats.opened += count;
      if (row.status === 'RESPONDED') stats.responded += count;
      if (row.status === 'BOUNCED') stats.bounced += count;
    }

    const dailyStats = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Get summary totals
    const [sentTotal, openedTotal, respondedTotal, bouncedTotal] = await Promise.all([
      prisma.outreach.count({
        where: { status: 'SENT', sentAt: { gte: startDate } },
      }),
      prisma.outreach.count({
        where: { status: 'OPENED', sentAt: { gte: startDate } },
      }),
      prisma.outreach.count({
        where: { status: 'RESPONDED', sentAt: { gte: startDate } },
      }),
      prisma.outreach.count({
        where: { status: 'BOUNCED', sentAt: { gte: startDate } },
      }),
    ]);

    // Get top accounts by email engagement
    const topAccounts = await prisma.outreach.groupBy({
      by: ['personId'],
      where: {
        sentAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    // Enrich with account names
    const personIds = topAccounts.map((t) => t.personId).filter(Boolean) as string[];
    const people = await prisma.people.findMany({
      where: { id: { in: personIds } },
      include: { target_accounts: { select: { name: true } } },
    });

    const topAccountsEnriched = topAccounts.map((t) => {
      const person = people.find((p) => p.id === t.personId);
      return {
        accountName: person?.target_accounts?.name || 'Unknown',
        emailCount: t._count.id,
      };
    });

    // Pending drafts count
    const pendingDrafts = await prisma.outreach.count({
      where: { status: 'DRAFT', channel: 'EMAIL' },
    });

    // Calculate rates
    const totalWithOutcome = openedTotal + respondedTotal + bouncedTotal + sentTotal;
    const openRate = totalWithOutcome > 0 ? ((openedTotal / totalWithOutcome) * 100).toFixed(1) : '0';
    const responseRate = totalWithOutcome > 0 ? ((respondedTotal / totalWithOutcome) * 100).toFixed(1) : '0';
    const bounceRate = totalWithOutcome > 0 ? ((bouncedTotal / totalWithOutcome) * 100).toFixed(1) : '0';

    return NextResponse.json({
      period: `${days} days`,
      summary: {
        sent: sentTotal,
        opened: openedTotal,
        responded: respondedTotal,
        bounced: bouncedTotal,
        pendingDrafts,
      },
      rates: {
        openRate: `${openRate}%`,
        responseRate: `${responseRate}%`,
        bounceRate: `${bounceRate}%`,
      },
      dailyStats,
      topAccounts: topAccountsEnriched,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    captureRouteError(error, {
      route: '/api/dashboards/email',
      method: 'GET',
      userId: authResult?.userId,
    });
    logger.error('[dashboards/email] Error generating dashboard data', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
