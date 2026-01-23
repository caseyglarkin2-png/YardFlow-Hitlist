import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get user's event IDs
    const eventIds = await getUserEventIds(userId);

    // Get contacts with enrichment data and recent activity
    const contacts = await prisma.contacts.findMany({
      where: {
        eventId: { in: eventIds },
        icpScore: { gt: 0 },
      },
      include: {
        companies: true,
        outreach: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        activities: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      take: limit * 2, // Get more to filter
    });

    // Calculate engagement heat score for each contact
    const targets = contacts.map(contact => {
      const engagementHeat = calculateEngagementHeat(contact);
      const dataQualityScore = calculateDataQuality(contact);
      const nextAction = determineNextAction(contact);

      return {
        id: contact.id,
        name: contact.name,
        title: contact.title,
        company: contact.companies?.name || 'Unknown',
        icpScore: contact.icpScore || 0,
        dataQualityScore,
        lastEngagement: contact.lastEngagement?.toISOString() || null,
        nextAction,
        email: contact.email,
        linkedInUrl: contact.linkedinUrl,
        phoneNumber: contact.phone,
        engagementHeat,
        recentActivities: contact.activities.length,
        lastOutreach: contact.outreach[0] || null,
      };
    });

    // Sort by engagement heat (combination of ICP score + recent activity)
    targets.sort((a, b) => {
      // Primary: Engagement heat
      if (b.engagementHeat !== a.engagementHeat) {
        return b.engagementHeat - a.engagementHeat;
      }
      // Secondary: ICP score
      if (b.icpScore !== a.icpScore) {
        return b.icpScore - a.icpScore;
      }
      // Tertiary: Data quality
      return b.dataQualityScore - a.dataQualityScore;
    });

    return NextResponse.json({
      success: true,
      targets: targets.slice(0, limit),
      summary: {
        total: targets.length,
        hotLeads: targets.filter(t => t.engagementHeat >= 80).length,
        withEmail: targets.filter(t => t.email).length,
        withLinkedIn: targets.filter(t => t.linkedInUrl).length,
        avgIcpScore: Math.round(
          targets.reduce((sum, t) => sum + t.icpScore, 0) / targets.length
        ),
      },
    });
  } catch (error) {
    console.error('Top targets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch targets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Get all event IDs for user
 */
async function getUserEventIds(userId: string): Promise<string[]> {
  const events = await prisma.events.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { team_members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  return events.map(e => e.id);
}

/**
 * Calculate engagement heat score (0-100)
 * Based on:
 * - Recent activity frequency
 * - ICP score
 * - Outreach status
 * - Time since last engagement
 */
function calculateEngagementHeat(contact: any): number {
  let heat = 0;

  // Base: ICP Score (0-40 points)
  heat += Math.min(contact.icpScore * 0.4, 40);

  // Recent activities (0-30 points)
  const recentActivityCount = contact.activities.length;
  heat += Math.min(recentActivityCount * 5, 30);

  // Outreach status (0-20 points)
  const lastOutreach = contact.outreach?.[0];
  if (lastOutreach) {
    if (lastOutreach.status === 'REPLIED') {
      heat += 20; // Hot! They replied
    } else if (lastOutreach.status === 'OPENED') {
      heat += 10; // Warm - they opened
    } else if (lastOutreach.status === 'SENT') {
      heat += 5; // Sent but no engagement yet
    }
  }

  // Recency (0-10 points)
  if (contact.lastEngagement) {
    const daysSince = Math.floor(
      (Date.now() - new Date(contact.lastEngagement).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 7) {
      heat += 10;
    } else if (daysSince < 14) {
      heat += 7;
    } else if (daysSince < 30) {
      heat += 4;
    }
  }

  return Math.min(Math.round(heat), 100);
}

/**
 * Calculate data quality score (0-100)
 */
function calculateDataQuality(contact: any): number {
  let score = 0;

  // Email (40 points)
  if (contact.email) score += 40;

  // Phone (15 points)
  if (contact.phone) score += 15;

  // LinkedIn (15 points)
  if (contact.linkedinUrl) score += 15;

  // Title (10 points)
  if (contact.title) score += 10;

  // Company (10 points)
  if (contact.companies) score += 10;

  // Industry (5 points)
  if (contact.companies?.industry) score += 5;

  // Location (5 points)
  if (contact.location) score += 5;

  return Math.min(score, 100);
}

/**
 * Determine next best action for a contact
 */
function determineNextAction(contact: any): string {
  const daysSinceEngagement = contact.lastEngagement
    ? Math.floor((Date.now() - new Date(contact.lastEngagement).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const lastOutreach = contact.outreach?.[0];
  const daysSinceOutreach = lastOutreach
    ? Math.floor((Date.now() - new Date(lastOutreach.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // No outreach yet
  if (!lastOutreach) {
    return 'INITIAL_OUTREACH';
  }

  // They replied!
  if (lastOutreach.status === 'REPLIED') {
    return 'BOOK_MEETING';
  }

  // Waiting for reply (< 7 days)
  if (lastOutreach.status === 'SENT' && daysSinceOutreach < 7) {
    return 'WAIT_FOR_REPLY';
  }

  // Follow up needed (7-14 days)
  if (lastOutreach.status === 'SENT' && daysSinceOutreach >= 7 && daysSinceOutreach < 14) {
    return 'FOLLOW_UP';
  }

  // Re-engage after long silence (> 30 days)
  if (daysSinceEngagement > 30) {
    return 'RE_ENGAGE';
  }

  return 'NURTURE';
}
