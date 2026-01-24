import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { calculateRoi } from "@/lib/roi-calculator";
import { calculateRoiUnified, getRoiCacheStats } from "@/lib/roi/calculator-integration";
import { getPersonaLabel } from "@/lib/ai-contact-insights";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, personId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    // Get account with dossier
    const account = await prisma.target_accounts.findUnique({
      where: { id: accountId },
      include: {
        company_dossiers: true,
        people: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get persona (if personId provided, use that person's persona, otherwise use default)
    let persona = "Operations Professional";
    if (personId) {
      const person = account.people.find(p => p.id === personId);
      if (person) {
        persona = getPersonaLabel(person);
      }
    }

    // Extract data from dossier
    const dossier = account.company_dossiers;
    let facilityCount: number | undefined;
    let operationalScale: string | undefined;
    let companySize: string | undefined;

    if (dossier) {
      // Try to parse facility count from string
      if (dossier.facilityCount) {
        const match = dossier.facilityCount.match(/\d+/);
        facilityCount = match ? parseInt(match[0]) : undefined;
      }
      operationalScale = dossier.operationalScale || undefined;
      companySize = dossier.companySize || undefined;
    }

    // Calculate ROI using unified approach (content hub → local fallback)
    const roiResult = await calculateRoiUnified({
      facilityCount,
      operationalScale,
      companySize,
      persona,
      industry: account.industry || undefined,
    });

    // Save calculation to database
    const roiCalculation = await prisma.roi_calculations.create({
      data: {
        id: crypto.randomUUID(),
        accountId: account.id,
        facilityCount,
        operationalScale,
        annualSavings: roiResult.annualSavings,
        paybackPeriod: roiResult.paybackPeriod,
        assumptions: JSON.stringify({
          ...roiResult.assumptions,
          source: roiResult.source,
          timestamp: roiResult.timestamp,
        }),
        calculatedBy: session.user.email,
      },
    });

    return NextResponse.json({
      roiCalculation,
      result: roiResult,
    });
  } catch (error) {
    console.error("Error calculating ROI:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to calculate ROI",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    // Get most recent ROI calculation for this account
    const roiCalculation = await prisma.roi_calculations.findFirst({
      where: { accountId },
      orderBy: { calculatedAt: 'desc' },
    });

    if (!roiCalculation) {
      return NextResponse.json(
        { error: "No ROI calculation found. Calculate ROI first." },
        { status: 404 }
      );
    }

    return NextResponse.json({ roiCalculation });
  } catch (error) {
    console.error("Error fetching ROI calculation:", error);
    return NextResponse.json(
      { error: "Failed to fetch ROI calculation" },
      { status: 500 }
    );
  }
}
