import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authServiceOrSession } from '@/lib/auth-service';
import { captureRouteError } from '@/lib/sentry-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Require auth - contains sensitive company research data
  const authResult = await authServiceOrSession(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Find the most recent dossier for this account
    const dossier = await prisma.company_dossiers.findFirst({
      where: {
        accountId: accountId,
      },
      orderBy: {
        researchedAt: 'desc',
      },
    });

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
    }

    // Parse the rawData JSON
    const rawDataObj =
      typeof dossier.rawData === 'object' && dossier.rawData !== null
        ? (dossier.rawData as Record<string, unknown>)
        : {};
    const parsedDossier = {
      ...dossier,
      ...rawDataObj, // Contains the full dossier structure
    };

    return NextResponse.json({
      success: true,
      dossier: parsedDossier,
    });
  } catch (error) {
    captureRouteError(error, {
      route: '/api/ai/dossier',
      method: 'GET',
      userId: authResult?.userId,
    });
    console.error('Error fetching dossier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dossier' },
      { status: 500 }
    );
  }
}
