import { NextRequest, NextResponse } from 'next/server';
import { authServiceOrSession } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/stats - Email engagement statistics
 * Returns aggregate stats for email opens, clicks, bounces, etc.
 */
export async function GET(request: NextRequest) {
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get email engagement stats grouped by event type
    const engagementStats = await prisma.email_engagement.groupBy({
      by: ['eventType'],
      where: {
        timestamp: { gte: startDate },
      },
      _count: { id: true },
    });

    // Convert to object
    const statsMap = engagementStats.reduce((acc, stat) => {
      acc[stat.eventType.toLowerCase()] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

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

    // Get daily trend for the period
    const dailyTrend = await prisma.outreach.groupBy({
      by: ['status'],
      where: {
        sentAt: { gte: startDate },
      },
      _count: { id: true },
    });

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
      statusBreakdown: dailyTrend.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    logger.error('Failed to get email stats', { error });
    return NextResponse.json(
      { error: 'Failed to retrieve email statistics' },
      { status: 500 }
    );
  }
}
