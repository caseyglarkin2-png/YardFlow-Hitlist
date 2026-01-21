import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';
import { generateCompanyResearch } from '@/lib/ai-research';

export const dynamic = 'force-dynamic';

/**
 * Trigger manual research refresh for specific accounts
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accountIds, forceRefresh } = await req.json();

  if (!accountIds || accountIds.length === 0) {
    return NextResponse.json({ error: 'accountIds required' }, { status: 400 });
  }

  const results = [];

  for (const accountId of accountIds) {
    try {
      const account = await prisma.targetAccount.findUnique({
        where: { id: accountId },
        include: { dossier: true },
      });

      if (!account) {
        results.push({ accountId, status: 'not_found' });
        continue;
      }

      // Check if refresh needed (7+ days old)
      const daysSinceUpdate = account.dossier?.researchedAt
        ? Math.floor((Date.now() - account.dossier.researchedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (!forceRefresh && daysSinceUpdate < 7) {
        results.push({ accountId, status: 'skipped', reason: 'Recently updated' });
        continue;
      }

      // Generate new dossier
      const newDossier = await generateCompanyResearch(account.name, account.website || undefined);

      // Compare with old dossier (simple JSON comparison)
      const oldDossierStr = account.dossier ? JSON.stringify(account.dossier) : '';
      const newDossierStr = JSON.stringify(newDossier);
      const hasChanged = oldDossierStr !== newDossierStr;

      // Update or create dossier
      await prisma.companyDossier.upsert({
        where: { accountId: accountId },
        create: {
          accountId,
          companyOverview: newDossier.companyOverview || null,
          recentNews: newDossier.recentNews || null,
          industryContext: newDossier.industryContext || null,
          keyPainPoints: newDossier.keyPainPoints || null,
          companySize: newDossier.companySize || null,
          facilityCount: newDossier.facilityCount || null,
          locations: newDossier.locations || null,
          operationalScale: newDossier.operationalScale || null,
          rawData: JSON.stringify(newDossier),
          researchedAt: new Date(),
          researchedBy: session.user.email,
        },
        update: {
          companyOverview: newDossier.companyOverview || null,
          recentNews: newDossier.recentNews || null,
          industryContext: newDossier.industryContext || null,
          keyPainPoints: newDossier.keyPainPoints || null,
          companySize: newDossier.companySize || null,
          facilityCount: newDossier.facilityCount || null,
          locations: newDossier.locations || null,
          operationalScale: newDossier.operationalScale || null,
          rawData: JSON.stringify(newDossier),
          researchedAt: new Date(),
          researchedBy: session.user.email,
        },
      });

      results.push({
        accountId,
        accountName: account.name,
        status: 'updated',
        hasChanged,
        daysSinceUpdate,
      });

      // If significant changes, create notification
      if (hasChanged) {
        // In a real system, would send email or create notification
        console.log(`Research updated for ${account.name}`);
      }
    } catch (error) {
      console.error(`Error refreshing ${accountId}:`, error);
      results.push({
        accountId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    totalProcessed: results.length,
    updated: results.filter((r) => r.status === 'updated').length,
    changed: results.filter((r) => r.status === 'updated' && r.hasChanged).length,
    results,
  });
}

/**
 * Get accounts that need research refresh
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user?.activeEventId) {
    return NextResponse.json({ error: 'No active event' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const daysOld = parseInt(searchParams.get('daysOld') || '7');
  const minIcpScore = parseInt(searchParams.get('minIcpScore') || '75');

  // Get accounts needing refresh (those without dossiers or old dossiers)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const accounts = await prisma.targetAccount.findMany({
    where: {
      eventId: user.activeEventId,
      icpScore: { gte: minIcpScore },
    },
    include: {
      dossier: true,
    },
    orderBy: { icpScore: 'desc' },
    take: 100,
  });

  // Filter accounts that need refresh
  const accountsNeedingRefresh = accounts.filter((a) => {
    if (!a.dossier) return true; // Never researched
    const daysSinceUpdate = Math.floor(
      (Date.now() - a.dossier.researchedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate >= daysOld;
  });

  const accountsWithAge = accountsNeedingRefresh.map((a) => ({
    id: a.id,
    name: a.name,
    icpScore: a.icpScore,
    dossierUpdatedAt: a.dossier?.researchedAt || null,
    daysSinceUpdate: a.dossier
      ? Math.floor((Date.now() - a.dossier.researchedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  return NextResponse.json({
    accountsNeedingRefresh: accountsWithAge.length,
    accounts: accountsWithAge,
  });
}
