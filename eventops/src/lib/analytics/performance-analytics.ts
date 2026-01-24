/**
 * Performance Analytics Engine - Sprint 34.3
 * Campaign and sequence performance tracking
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface CampaignMetrics {
  campaignId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  overview: {
    totalContacts: number;
    activeEnrollments: number;
    completedEnrollments: number;
    exitedEnrollments: number;
  };
  engagement: {
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    repliesReceived: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
  };
  conversion: {
    meetingsBooked: number;
    dealsCreated: number;
    conversionRate: number;
  };
  channelBreakdown: Record<
    string,
    {
      sent: number;
      opened: number;
      clicked: number;
      replied: number;
    }
  >;
  personaPerformance: Record<
    string,
    {
      contacts: number;
      replyRate: number;
      meetingRate: number;
    }
  >;
}

class PerformanceAnalytics {
  /**
   * Get comprehensive campaign metrics
   */
  async getCampaignMetrics(
    sequenceId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<CampaignMetrics> {
    const whereClause: { sequence_id: string; created_at?: { gte: Date; lte: Date } } = {
      sequence_id: sequenceId,
    };

    if (timeRange) {
      whereClause.created_at = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    // Get all enrollments
    const enrollments = await prisma.sequence_enrollments.findMany({
      where: whereClause,
      include: {
        sequence_steps: {
          include: {
            email_engagement: true,
          },
        },
        people: true,
      },
    });

    // Calculate overview metrics
    const overview = {
      totalContacts: enrollments.length,
      activeEnrollments: enrollments.filter((e) => e.status === 'ACTIVE').length,
      completedEnrollments: enrollments.filter((e) => e.status === 'COMPLETED').length,
      exitedEnrollments: enrollments.filter((e) => e.status === 'EXITED').length,
    };

    // Calculate engagement metrics
    let emailsSent = 0;
    let emailsOpened = 0;
    let emailsClicked = 0;
    let repliesReceived = 0;
    const channelBreakdown: Record<string, { sent: number; opened: number; clicked: number }> = {};
    const personaPerformance: Record<
      string,
      { sent: number; opened: number; clicked: number; replied: number }
    > = {};

    for (const enrollment of enrollments) {
      const steps = enrollment.sequence_steps || [];
      // Determine persona from boolean flags
      const person = enrollment.people;
      let persona = 'unknown';
      if (person?.isExecOps) persona = 'ExecOps';
      else if (person?.isOps) persona = 'Ops';
      else if (person?.isProc) persona = 'Procurement';
      else if (person?.isSales) persona = 'Sales';

      // Initialize persona tracking
      if (!personaPerformance[persona]) {
        personaPerformance[persona] = {
          contacts: 0,
          replies: 0,
          meetings: 0,
        };
      }
      personaPerformance[persona].contacts++;

      for (const step of steps) {
        const channel = step.channel || 'EMAIL';

        // Initialize channel tracking
        if (!channelBreakdown[channel]) {
          channelBreakdown[channel] = {
            sent: 0,
            opened: 0,
            clicked: 0,
            replied: 0,
          };
        }

        if (step.sent_at) {
          emailsSent++;
          channelBreakdown[channel].sent++;
        }

        if (step.opened_at) {
          emailsOpened++;
          channelBreakdown[channel].opened++;
        }

        if (step.clicked_at) {
          emailsClicked++;
          channelBreakdown[channel].clicked++;
        }

        if (step.replied_at) {
          repliesReceived++;
          channelBreakdown[channel].replied++;
          personaPerformance[persona].replies++;
        }
      }
    }

    const engagement = {
      emailsSent,
      emailsOpened,
      emailsClicked,
      repliesReceived,
      openRate: emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0,
      clickRate: emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0,
      replyRate: emailsSent > 0 ? (repliesReceived / emailsSent) * 100 : 0,
    };

    // Calculate persona performance rates
    for (const persona in personaPerformance) {
      const data = personaPerformance[persona];
      personaPerformance[persona] = {
        contacts: data.contacts,
        replyRate: data.contacts > 0 ? (data.replies / data.contacts) * 100 : 0,
        meetingRate: data.contacts > 0 ? (data.meetings / data.contacts) * 100 : 0,
      };
    }

    // TODO: Track meetings booked and deals created via integrations
    const conversion = {
      meetingsBooked: 0,
      dealsCreated: 0,
      conversionRate: 0,
    };

    return {
      campaignId: sequenceId,
      timeRange: timeRange || {
        start: new Date(0),
        end: new Date(),
      },
      overview,
      engagement,
      conversion,
      channelBreakdown,
      personaPerformance,
    };
  }

  /**
   * Get top performing sequences
   */
  async getTopSequences(limit: number = 10): Promise<
    Array<{
      sequenceId: string;
      sequenceName: string;
      replyRate: number;
      totalEnrollments: number;
    }>
  > {
    const sequences = await prisma.sequences.findMany({
      include: {
        sequence_enrollments: {
          include: {
            sequence_steps: true,
          },
        },
      },
    });

    const metrics = sequences.map((seq) => {
      const enrollments = seq.sequence_enrollments || [];
      const totalSteps = enrollments.reduce((sum, e) => sum + (e.sequence_steps?.length || 0), 0);
      const repliedSteps = enrollments.reduce(
        (sum, e) => sum + (e.sequence_steps?.filter((s) => s.replied_at).length || 0),
        0
      );

      return {
        sequenceId: seq.id,
        sequenceName: seq.name,
        replyRate: totalSteps > 0 ? (repliedSteps / totalSteps) * 100 : 0,
        totalEnrollments: enrollments.length,
      };
    });

    // Sort by reply rate and take top N
    return metrics.sort((a, b) => b.replyRate - a.replyRate).slice(0, limit);
  }

  /**
   * Export metrics for reporting
   */
  async exportMetrics(sequenceId: string): Promise<string> {
    const metrics = await this.getCampaignMetrics(sequenceId);

    // Generate CSV format
    const csv = [
      'Metric,Value',
      `Total Contacts,${metrics.overview.totalContacts}`,
      `Active Enrollments,${metrics.overview.activeEnrollments}`,
      `Completed Enrollments,${metrics.overview.completedEnrollments}`,
      `Emails Sent,${metrics.engagement.emailsSent}`,
      `Emails Opened,${metrics.engagement.emailsOpened}`,
      `Open Rate,${metrics.engagement.openRate.toFixed(2)}%`,
      `Click Rate,${metrics.engagement.clickRate.toFixed(2)}%`,
      `Reply Rate,${metrics.engagement.replyRate.toFixed(2)}%`,
    ].join('\n');

    logger.info('Metrics exported', { sequenceId });

    return csv;
  }
}

export const performanceAnalytics = new PerformanceAnalytics();
