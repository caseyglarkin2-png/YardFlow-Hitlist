import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';
import { generateAccountDossier } from '@/lib/openai';

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
      });

      if (!account) {
        results.push({ accountId, status: 'not_found' });
        continue;
      }

      // Check if refresh needed (7+ days old)
      const daysSinceUpdate = account.dossierUpdatedAt
        ? Math.floor((Date.now() - account.dossierUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (!forceRefresh && daysSinceUpdate < 7) {
        results.push({ accountId, status: 'skipped', reason: 'Recently updated' });
        continue;
      }

      // Generate new dossier
      const newDossier = await generateAccountDossier(account.name, account.domain || '');

      // Compare with old dossier
      const hasChanged = JSON.stringify(newDossier) !== account.dossier;

      // Update account
      await prisma.targetAccount.update({
        where: { id: accountId },
        data: {
          dossier: JSON.stringify(newDossier),
          dossierUpdatedAt: new Date(),
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

  // Get accounts needing refresh
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const accounts = await prisma.targetAccount.findMany({
    where: {
      eventId: user.activeEventId,
      icpScore: { gte: minIcpScore },
      OR: [{ dossierUpdatedAt: null }, { dossierUpdatedAt: { lt: cutoffDate } }],
    },
    orderBy: { icpScore: 'desc' },
    take: 100,
  });

  const accountsWithAge = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    icpScore: a.icpScore,
    dossierUpdatedAt: a.dossierUpdatedAt,
    daysSinceUpdate: a.dossierUpdatedAt
      ? Math.floor((Date.now() - a.dossierUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  return NextResponse.json({
    accountsNeedingRefresh: accountsWithAge.length,
    accounts: accountsWithAge,
  });
}
