import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateCompanyResearch, generatePersonalizedOutreach } from "@/lib/ai-research";

export const dynamic = 'force-dynamic';

function getPersonaLabel(person: any): string {
  if (person.isExecOps) return "Executive Operations Leader";
  if (person.isOps) return "Operations Professional";
  if (person.isProc) return "Procurement Specialist";
  if (person.isSales) return "Sales Leader";
  if (person.isTech) return "Technology Leader";
  if (person.isNonOps) return "Business Leader";
  return "Professional";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personIds, channel = 'EMAIL', eventId } = body;

    if (!personIds || personIds.length === 0) {
      return NextResponse.json(
        { error: "Person IDs required" },
        { status: 400 }
      );
    }

    // Get event
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get people with accounts, dossiers, insights, and ROI calculations
    const people = await db.people.findMany({
      where: { id: { in: personIds } },
      include: {
        target_accounts: {
          include: {
            dossier: true,
            roiCalculations: {
              orderBy: { calculatedAt: 'desc' },
              take: 1,
            },
          },
        },
        insights: true,
      },
    });

    const results = [];
    let created = 0;

    for (const person of people) {
      try {
        // Generate or get company research
        let dossier = person.target_accounts.dossier;
        
        if (!dossier) {
          const researchData = await generateCompanyResearch(
            person.target_accounts.name,
            person.target_accounts.website || undefined
          );

          dossier = await db.companyDossier.create({
            data: {
              accountId: person.target_accounts.id,
              companyOverview: researchData.companyOverview || null,
              recentNews: researchData.recentNews || null,
              industryContext: researchData.industryContext || null,
              keyPainPoints: researchData.keyPainPoints || null,
              companySize: researchData.companySize || null,
              facilityCount: researchData.facilityCount || null,
              locations: researchData.locations || null,
              operationalScale: researchData.operationalScale || null,
              rawData: JSON.stringify(researchData),
              researchedBy: session.user.email,
            },
          });
        }

        // Parse dossier data
        const dossierData = dossier.rawData ? JSON.parse(dossier.rawData) : {
          companyOverview: dossier.companyOverview,
          keyPainPoints: dossier.keyPainPoints,
          industryContext: dossier.industryContext,
          facilityCount: dossier.facilityCount,
          operationalScale: dossier.operationalScale,
        };

        // Get contact insights if available
        const contactInsights = person.insights ? {
          roleContext: person.insights.roleContext,
          likelyPainPoints: person.insights.likelyPainPoints,
          roiOpportunity: person.insights.roiOpportunity,
        } : undefined;

        // Get ROI data if available
        const roiData = person.target_accounts.roiCalculations?.[0] ? {
          annualSavings: person.target_accounts.roiCalculations[0].annualSavings,
          paybackPeriod: person.target_accounts.roiCalculations[0].paybackPeriod,
          assumptions: person.target_accounts.roiCalculations[0].assumptions 
            ? JSON.parse(person.target_accounts.roiCalculations[0].assumptions) 
            : undefined,
        } : undefined;

        // Generate personalized outreach
        const persona = getPersonaLabel(person);
        const outreachData = await generatePersonalizedOutreach(
          person.name,
          person.title,
          person.target_accounts.name,
          persona,
          dossierData,
          channel,
          contactInsights,
          roiData
        );

        // Create outreach record
        const outreach = await db.outreach.create({
          data: {
            personId: person.id,
            channel,
            status: "DRAFT",
            subject: outreachData.subject || null,
            message: outreachData.message,
            sentBy: session.user.email,
          },
        });

        created++;
        results.push({
          personId: person.id,
          personName: person.name,
          companyName: person.target_accounts.name,
          success: true,
        });
      } catch (error) {
        console.error(`Error generating outreach for ${person.name}:`, error);
        results.push({
          personId: person.id,
          personName: person.name,
          companyName: person.target_accounts.name,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      total: personIds.length,
      results,
    });
  } catch (error) {
    console.error("Error generating AI outreach:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to generate outreach",
        details: errorMessage,
        hint: errorMessage.includes('API key') ? 'Check OPENAI_API_KEY environment variable' : undefined
      },
      { status: 500 }
    );
  }
}
