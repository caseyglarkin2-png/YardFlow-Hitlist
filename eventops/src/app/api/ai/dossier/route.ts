import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Dossier not found' },
        { status: 404 }
      );
    }

    // Parse the rawData JSON
    const parsedDossier = {
      ...dossier,
      ...(dossier.rawData as any), // Contains the full dossier structure
    };

    return NextResponse.json({
      success: true,
      dossier: parsedDossier,
    });
  } catch (error: any) {
    console.error('Error fetching dossier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dossier' },
      { status: 500 }
    );
  }
}
