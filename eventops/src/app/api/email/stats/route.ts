import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

/**
 * Generate daily breakdown for a date range
 */
function generateDailyData(
  startDate: Date,
  endDate: Date
): Array<{ date: string; sent: number; opened: number; clicked: number; bounced: number }> {
  const days: Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push({
      date: current.toISOString().split('T')[0],
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * GET /api/email/stats - Email engagement statistics
 * Returns aggregate stats for email opens, clicks, bounces, etc.
 * Supports groupBy=day for daily breakdown
 */
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const groupBy = searchParams.get('groupBy'); // 'day' | null
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get email engagement stats grouped by event type
    let statsMap: Record<string, number> = {};
    try {
      const engagementStats = await prisma.email_engagement.groupBy({
        by: ['eventType'],
        where: {
          timestamp: { gte: startDate },
        },
        _count: { id: true },
      });

      // Convert to object
      statsMap = engagementStats.reduce(
        (acc, stat) => {
          acc[stat.eventType.toLowerCase()] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>
      );
    } catch {
      // Table might not exist or be empty - continue with empty stats
    }

    // Get outreach stats (sent emails)
    const sentCount = await prisma.outreach.count({
      where: {
        status: 'SENT',
        sentAt: { gte: startDate },
      },
    });

    const openedCount = await prisma.outreach.count({
      where: {
        status: { in: ['OPENED', 'RESPONDED'] },
        sentAt: { gte: startDate },
      },
    });

    const respondedCount = await prisma.outreach.count({
      where: {
        status: 'RESPONDED',
        sentAt: { gte: startDate },
      },
    });

    const bouncedCount = await prisma.outreach.count({
      where: {
        status: 'BOUNCED',
        sentAt: { gte: startDate },
      },
    });

    // Calculate rates
    const openRate = sentCount > 0 ? ((openedCount / sentCount) * 100).toFixed(1) : '0';
    const responseRate = sentCount > 0 ? ((respondedCount / sentCount) * 100).toFixed(1) : '0';
    const bounceRate = sentCount > 0 ? ((bouncedCount / sentCount) * 100).toFixed(1) : '0';

    // Get status breakdown
    let statusBreakdown: Record<string, number> = {};
    try {
      const dailyTrend = await prisma.outreach.groupBy({
        by: ['status'],
        where: {
          sentAt: { gte: startDate },
        },
        _count: { id: true },
      });
      statusBreakdown = dailyTrend.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      );
    } catch {
      // Continue with empty if fails
    }

    // Generate daily breakdown if requested
    let dailyData:
      | Array<{ date: string; sent: number; opened: number; clicked: number; bounced: number }>
      | undefined;
    if (groupBy === 'day') {
      dailyData = generateDailyData(startDate, new Date());

      // Get all outreach records and populate daily data
      const outreaches = await prisma.outreach.findMany({
        where: {
          sentAt: { gte: startDate },
        },
        select: {
          status: true,
          sentAt: true,
        },
      });

      for (const outreach of outreaches) {
        if (outreach.sentAt) {
          const dateKey = outreach.sentAt.toISOString().split('T')[0];
          const dayEntry = dailyData.find((d) => d.date === dateKey);
          if (dayEntry) {
            dayEntry.sent++;
            if (outreach.status === 'OPENED' || outreach.status === 'RESPONDED') {
              dayEntry.opened++;
            }
            if (outreach.status === 'BOUNCED') {
              dayEntry.bounced++;
            }
          }
        }
      }
    }

    logger.info('Email stats retrieved', {
      userId: authResult.userId,
      days,
      sentCount,
      openedCount,
    });

    return NextResponse.json({
      period: `${days} days`,
      summary: {
        sent: sentCount,
        opened: openedCount,
        responded: respondedCount,
        bounced: bouncedCount,
        clicks: statsMap.click || 0,
      },
      rates: {
        openRate: `${openRate}%`,
        responseRate: `${responseRate}%`,
        bounceRate: `${bounceRate}%`,
      },
      engagementEvents: statsMap,
      statusBreakdown,
      // Include daily data if groupBy=day requested
      ...(dailyData ? { daily: dailyData } : {}),
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/email/stats',
      method: 'GET',
      userId: authResult?.userId,
    });
    logger.error('Failed to get email stats', { error });
    return NextResponse.json({ error: 'Failed to retrieve email statistics' }, { status: 500 });
  }
}
