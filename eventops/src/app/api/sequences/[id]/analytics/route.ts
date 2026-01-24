import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequence = await prisma.outreachSequence.findFirst({
      where: {
        id: params.id,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        steps: true,
        totalEnrolled: true,
        totalCompleted: true,
        totalActive: true,
      },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    const enrollmentStats = await prisma.sequenceEnrollment.groupBy({
      by: ['status'],
      where: { sequenceId: params.id },
      _count: true,
    });

    const statusBreakdown = enrollmentStats.reduce((acc: any, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {});

    const emailStats = await prisma.emailActivity.findMany({
      where: {
        enrollment: {
          sequenceId: params.id,
        },
      },
      select: {
        stepNumber: true,
        sentAt: true,
        openedAt: true,
        clickedAt: true,
        repliedAt: true,
        bouncedAt: true,
        status: true,
      },
    });

    const totalSent = emailStats.length;
    const totalOpened = emailStats.filter(e => e.openedAt).length;
    const totalClicked = emailStats.filter(e => e.clickedAt).length;
    const totalReplied = emailStats.filter(e => e.repliedAt).length;
    const totalBounced = emailStats.filter(e => e.bouncedAt).length;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    const steps = sequence.steps as any[];
    const stepAnalytics = steps.map((step, index) => {
      const stepEmails = emailStats.filter(e => e.stepNumber === index);
      const stepSent = stepEmails.length;
      const stepOpened = stepEmails.filter(e => e.openedAt).length;
      const stepClicked = stepEmails.filter(e => e.clickedAt).length;
      const stepReplied = stepEmails.filter(e => e.repliedAt).length;
      const stepBounced = stepEmails.filter(e => e.bouncedAt).length;

      return {
        stepNumber: index,
        subject: step.subject,
        sent: stepSent,
        opened: stepOpened,
        clicked: stepClicked,
        replied: stepReplied,
        bounced: stepBounced,
        openRate: stepSent > 0 ? Math.round((stepOpened / stepSent) * 10000) / 100 : 0,
        clickRate: stepSent > 0 ? Math.round((stepClicked / stepSent) * 10000) / 100 : 0,
        replyRate: stepSent > 0 ? Math.round((stepReplied / stepSent) * 10000) / 100 : 0,
        bounceRate: stepSent > 0 ? Math.round((stepBounced / stepSent) * 10000) / 100 : 0,
      };
    });

    const funnel = {
      enrolled: sequence.totalEnrolled,
      sentFirstEmail: stepAnalytics[0]?.sent || 0,
      openedFirstEmail: stepAnalytics[0]?.opened || 0,
      clickedAnyEmail: totalClicked,
      replied: totalReplied,
      completed: sequence.totalCompleted,
    };

    const completionRate = sequence.totalEnrolled > 0 
      ? (sequence.totalCompleted / sequence.totalEnrolled) * 100 
      : 0;

    const analytics = {
      sequence: {
        id: sequence.id,
        name: sequence.name,
      },
      summary: {
        totalEnrolled: sequence.totalEnrolled,
        totalActive: sequence.totalActive,
        totalCompleted: sequence.totalCompleted,
        completionRate: Math.round(completionRate * 100) / 100,
      },
      enrollmentStatus: statusBreakdown,
      emailMetrics: {
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        totalBounced,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        replyRate: Math.round(replyRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
      },
      stepAnalytics,
      conversionFunnel: funnel,
    };

    return NextResponse.json({ analytics });
  } catch (error: any) {
    logger.error('Error fetching sequence analytics', { sequenceId: params.id, error });
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
