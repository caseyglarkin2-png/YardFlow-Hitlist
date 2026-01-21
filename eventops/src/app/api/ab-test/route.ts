import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Create A/B test for outreach messages
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, description, variants, targetFilters, sampleSize } = await req.json();

  if (!name || !variants || variants.length < 2) {
    return NextResponse.json(
      { error: 'name and at least 2 variants required' },
      { status: 400 }
    );
  }

  // Create campaign for A/B test
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      eventId: user.activeEventId,
      name: `A/B Test: ${name}`,
      description: `${description}\n\nVariants: ${variants.map((v: any, i: number) => `${String.fromCharCode(65 + i)}: ${v.name}`).join(', ')}`,
      status: 'ACTIVE',
      createdBy: session.user.id,
      goals: JSON.stringify({
        testName: name,
        variants: variants.length,
        sampleSize: sampleSize || 100,
        targetFilters,
      }),
    },
  });

  return NextResponse.json({
    testId: campaign.id,
    name,
    variants: variants.length,
    status: 'ACTIVE',
    message: 'A/B test created. Assign contacts to variants manually or use auto-assignment.',
  });
}

/**
 * Get A/B test results
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const testId = searchParams.get('testId');

  if (!testId) {
    return NextResponse.json({ error: 'testId required' }, { status: 400 });
  }

  // Get campaign (test)
  const campaign = await prisma.campaign.findUnique({
    where: { id: testId },
    include: {
      outreach: {
        include: {
          person: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  // Group by variant (using notes field or templateId as variant identifier)
  const variantStats: Record<string, any> = {};

  campaign.outreach.forEach((o) => {
    const variant = o.templateId || 'control';
    if (!variantStats[variant]) {
      variantStats[variant] = {
        variant,
        total: 0,
        sent: 0,
        opened: 0,
        responded: 0,
        openRate: 0,
        responseRate: 0,
      };
    }

    variantStats[variant].total += 1;
    if (o.status === 'SENT' || o.status === 'OPENED' || o.status === 'RESPONDED') {
      variantStats[variant].sent += 1;
    }
    if (o.status === 'OPENED' || o.status === 'RESPONDED') {
      variantStats[variant].opened += 1;
    }
    if (o.status === 'RESPONDED') {
      variantStats[variant].responded += 1;
    }
  });

  // Calculate rates
  Object.values(variantStats).forEach((stats: any) => {
    stats.openRate = stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0;
    stats.responseRate = stats.sent > 0 ? (stats.responded / stats.sent) * 100 : 0;
  });

  // Determine winner (highest response rate with minimum sample size)
  const variants = Object.values(variantStats) as any[];
  const minSampleSize = 20; // Minimum sends for statistical validity
  const qualifiedVariants = variants.filter((v) => v.sent >= minSampleSize);
  const winner =
    qualifiedVariants.length > 0
      ? qualifiedVariants.reduce((a, b) => (a.responseRate > b.responseRate ? a : b))
      : null;

  return NextResponse.json({
    testName: campaign.name,
    status: campaign.status,
    totalOutreach: campaign.outreach.length,
    variants: Object.values(variantStats),
    winner: winner
      ? {
          variant: winner.variant,
          responseRate: winner.responseRate.toFixed(1) + '%',
          sampleSize: winner.sent,
        }
      : null,
    statisticalValidity: qualifiedVariants.length >= 2,
  });
}
