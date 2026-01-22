import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateContactInsights, getPersonaLabel } from "@/lib/ai-contact-insights";

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

    const personId = params.id;

    // Get person with account and dossier
    const person = await db.people.findUnique({
      where: { id: personId },
      include: {
        target_accounts: {
          include: {
            dossier: true,
          },
        },
        insights: true,
      },
    });

    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Check if insights exist and are recent (less than 30 days old)
    if (person.insights) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (person.insights.generatedAt > thirtyDaysAgo) {
        return NextResponse.json({
          cached: true,
          insights: person.insights,
        });
      }
    }

    // Get company dossier (or create if missing)
    const dossier = person.target_accounts.dossier;
    if (!dossier) {
      return NextResponse.json(
        { error: "Company dossier not found. Please generate company research first." },
        { status: 400 }
      );
    }

    // Parse dossier data
    const dossierData = dossier.rawData ? JSON.parse(dossier.rawData) : {
      companyOverview: dossier.companyOverview,
      keyPainPoints: dossier.keyPainPoints,
      industryContext: dossier.industryContext,
      facilityCount: dossier.facilityCount,
      operationalScale: dossier.operationalScale,
      companySize: dossier.companySize,
    };

    // Generate contact insights
    const persona = getPersonaLabel(person);
    const insightsData = await generateContactInsights(
      person.name,
      person.title,
      persona,
      dossierData
    );

    // Upsert insights
    const insights = await db.contactInsights.upsert({
      where: { personId: person.id },
      create: {
        personId: person.id,
        roleContext: insightsData.roleContext,
        likelyPainPoints: JSON.stringify(insightsData.likelyPainPoints),
        suggestedApproach: insightsData.suggestedApproach,
        roiOpportunity: insightsData.roiOpportunity,
        confidence: insightsData.confidence,
        generatedBy: session.user.email,
      },
      update: {
        roleContext: insightsData.roleContext,
        likelyPainPoints: JSON.stringify(insightsData.likelyPainPoints),
        suggestedApproach: insightsData.suggestedApproach,
        roiOpportunity: insightsData.roiOpportunity,
        confidence: insightsData.confidence,
        generatedAt: new Date(),
        generatedBy: session.user.email,
      },
    });

    return NextResponse.json({
      cached: false,
      insights,
    });
  } catch (error) {
    console.error("Error generating contact insights:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to generate contact insights",
        details: errorMessage,
        hint: errorMessage.includes('API key') ? 'Check OPENAI_API_KEY environment variable' : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await db.contactInsights.findUnique({
      where: { personId: params.id },
    });

    if (!insights) {
      return NextResponse.json(
        { error: "No insights found. Generate insights first." },
        { status: 404 }
      );
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Error fetching contact insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact insights" },
      { status: 500 }
    );
  }
}
