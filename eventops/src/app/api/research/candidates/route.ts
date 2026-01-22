import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db as prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/research/candidates
 * Get accounts that need research (no dossier or old dossier)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email! },
    });

    if (!user?.activeEventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const daysOld = parseInt(searchParams.get('daysOld') || '7');
    const minIcpScore = parseInt(searchParams.get('minIcpScore') || '0');
    const limit = parseInt(searchParams.get('limit') || '500');
    const missingOnly = searchParams.get('missingOnly') === 'true';

    // Get accounts with their dossier status
    const accounts = await prisma.target_accounts.findMany({
      where: {
        eventId: user.activeEventId,
        ...(minIcpScore > 0 ? { icpScore: { gte: minIcpScore } } : {}),
      },
      include: {
        dossier: {
          select: {
            id: true,
            researchedAt: true,
          },
        },
      },
      orderBy: { icpScore: 'desc' },
      take: limit,
    });

    // Filter and map accounts
    const candidates = accounts
      .map(account => {
        const daysSinceUpdate = account.dossier
          ? Math.floor((Date.now() - account.dossier.researchedAt.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const needsResearch = !account.dossier || (daysSinceUpdate !== null && daysSinceUpdate >= daysOld);

        return {
          id: account.id,
          name: account.name,
          website: account.website,
          industry: account.industry,
          icpScore: account.icpScore,
          hasDossier: !!account.dossier,
          daysSinceUpdate,
          needsResearch,
        };
      })
      .filter(account => !missingOnly || account.needsResearch);

    return NextResponse.json({
      totalAccounts: candidates.length,
      needingResearch: candidates.filter(a => a.needsResearch).length,
      accounts: candidates,
      filters: {
        daysOld,
        minIcpScore,
        missingOnly,
      },
    });
  } catch (error) {
    console.error('Error getting research candidates:', error);
    return NextResponse.json(
      { error: 'Failed to get candidates' },
      { status: 500 }
    );
  }
}
