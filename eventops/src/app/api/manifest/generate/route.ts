import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateManifestMeetingRequest, generateSimpleManifestRequest } from "@/lib/manifest-generator";
import { getPersonaLabel } from "@/lib/ai-contact-insights";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { personIds, useAI = true } = body;

    if (!personIds || personIds.length === 0) {
      return NextResponse.json(
        { error: "Person IDs required" },
        { status: 400 }
      );
    }

    // Get people with all context
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

    for (const person of people) {
      try {
        const persona = getPersonaLabel(person);
        let requestData;

        if (useAI) {
          // Get company dossier
          const dossierData = person.target_accounts.dossier?.rawData 
            ? JSON.parse(person.target_accounts.dossier.rawData)
            : undefined;

          // Get ROI opportunity from insights
          const roiOpportunity = person.insights?.roiOpportunity || undefined;

          requestData = await generateManifestMeetingRequest(
            person.name,
            person.title,
            person.target_accounts.name,
            persona,
            dossierData,
            roiOpportunity
          );
        } else {
          // Use simple template
          requestData = generateSimpleManifestRequest(
            person.name,
            person.target_accounts.name,
            persona
          );
        }

        results.push({
          personId: person.id,
          personName: person.name,
          companyName: person.target_accounts.name,
          email: person.email,
          message: requestData.message,
          characterCount: requestData.characterCount,
          success: true,
        });
      } catch (error) {
        console.error(`Error generating Manifest request for ${person.name}:`, error);
        results.push({
          personId: person.id,
          personName: person.name,
          companyName: person.target_accounts.name,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      generated: successCount,
      total: personIds.length,
      results,
    });
  } catch (error) {
    console.error("Error generating Manifest requests:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to generate Manifest requests",
        details: errorMessage,
        hint: errorMessage.includes('API key') ? 'Check OPENAI_API_KEY environment variable' : undefined
      },
      { status: 500 }
    );
  }
}
