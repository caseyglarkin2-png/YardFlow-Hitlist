import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateCompanyResearch } from "@/lib/ai-research";

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await db.targetAccount.findUnique({
      where: { id: params.id },
      include: { dossier: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if dossier already exists and is recent (less than 7 days old)
    if (account.dossier) {
      const daysSinceResearch = Math.floor(
        (Date.now() - account.dossier.researchedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceResearch < 7) {
        return NextResponse.json({
          dossier: account.dossier,
          cached: true,
        });
      }
    }

    // Generate new research
    const researchData = await generateCompanyResearch(
      account.name,
      account.website || undefined
    );

    // Save or update dossier
    const dossier = await db.companyDossier.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        companyOverview: researchData.companyOverview || null,
        recentNews: researchData.recentNews || null,
        industryContext: researchData.industryContext || null,
        keyPainPoints: researchData.keyPainPoints || null,
        companySize: researchData.companySize || null,
        rawData: JSON.stringify(researchData),
        researchedBy: session.user.email,
      },
      update: {
        companyOverview: researchData.companyOverview || null,
        recentNews: researchData.recentNews || null,
        industryContext: researchData.industryContext || null,
        keyPainPoints: researchData.keyPainPoints || null,
        companySize: researchData.companySize || null,
        rawData: JSON.stringify(researchData),
        researchedAt: new Date(),
        researchedBy: session.user.email,
      },
    });

    return NextResponse.json({
      dossier,
      cached: false,
    });
  } catch (error) {
    console.error("Error generating research:", error);
    return NextResponse.json(
      { error: "Failed to generate research" },
      { status: 500 }
    );
  }
}
