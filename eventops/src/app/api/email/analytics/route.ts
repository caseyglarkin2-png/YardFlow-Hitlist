import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/analytics
 * Aggregate email analytics
 */
export async function GET(request: NextRequest) {
  const { error, response } = await requireAuth(request);
  if (error) return response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const groupBy = searchParams.get('groupBy') || 'day';
    const sequenceId = searchParams.get('sequenceId');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clause for sequence steps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepWhere: any = {
      sent_at: { gte: startDate },
    };
    if (sequenceId) {
      stepWhere.enrollment = { sequence_id: sequenceId };
    }

    // Get aggregate stats from sequence_steps
    const [
      sentCount,
      deliveredCount, // We'll use SENT as delivered proxy
      openedCount,
      clickedCount,
      repliedCount,
      bouncedCount,
    ] = await Promise.all([
      prisma.sequence_steps.count({
        where: { ...stepWhere, status: { in: ['SENT', 'OPENED', 'CLICKED', 'REPLIED'] } },
      }),
      prisma.sequence_steps.count({
        where: { ...stepWhere, status: { in: ['SENT', 'OPENED', 'CLICKED', 'REPLIED'] } },
      }),
      prisma.sequence_steps.count({
        where: { ...stepWhere, opened_at: { not: null } },
      }),
      prisma.sequence_steps.count({
        where: { ...stepWhere, clicked_at: { not: null } },
      }),
      prisma.sequence_steps.count({
        where: { ...stepWhere, replied_at: { not: null } },
      }),
      prisma.sequence_steps.count({
        where: { ...stepWhere, status: 'FAILED' },
      }),
    ]);

    // Calculate rates
    const openRate = sentCount > 0 ? (openedCount / sentCount) * 100 : 0;
    const clickRate = sentCount > 0 ? (clickedCount / sentCount) * 100 : 0;
    const replyRate = sentCount > 0 ? (repliedCount / sentCount) * 100 : 0;
    const bounceRate = sentCount > 0 ? (bouncedCount / sentCount) * 100 : 0;

    const summary = {
      sent: sentCount,
      delivered: deliveredCount,
      opened: openedCount,
      clicked: clickedCount,
      replied: repliedCount,
      bounced: bouncedCount,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
      replyRate: Math.round(replyRate * 10) / 10,
      bounceRate: Math.round(bounceRate * 10) / 10,
    };

    // Get daily breakdown if groupBy is 'day'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let byPeriod: any[] | undefined;

    if (groupBy === 'day') {
      // Get engagement events grouped by day
      const dailyStats = await prisma.$queryRaw<
        Array<{
          date: string;
          sent: bigint;
          opened: bigint;
          clicked: bigint;
          replied: bigint;
        }>
      >`
        SELECT 
          DATE(sent_at) as date,
          COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
          COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
          COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
          COUNT(*) FILTER (WHERE replied_at IS NOT NULL) as replied
        FROM sequence_steps
        WHERE sent_at >= ${startDate}
        ${sequenceId ? prisma.$queryRaw`AND enrollment_id IN (SELECT id FROM sequence_enrollments WHERE sequence_id = ${sequenceId})` : prisma.$queryRaw``}
        GROUP BY DATE(sent_at)
        ORDER BY date DESC
        LIMIT 90
      `;

      byPeriod = dailyStats.map((d) => ({
        period: d.date,
        sent: Number(d.sent),
        opened: Number(d.opened),
        clicked: Number(d.clicked),
        replied: Number(d.replied),
      }));
    }

    return NextResponse.json({
      summary,
      byPeriod,
    });
  } catch (err) {
    logger.error('Failed to get email analytics', { error: String(err) });
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
