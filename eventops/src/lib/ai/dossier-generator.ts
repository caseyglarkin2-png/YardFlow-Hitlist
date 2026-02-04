/**
 * AI Dossier Generator (Gemini Pro)
 * Generates comprehensive company dossiers using Gemini Pro
 */

import { GeminiProClient } from './gemini-client';
import { prisma } from '@/lib/db';

export interface DossierGenerationResult {
  accountId: string;
  companyName: string;
  success: boolean;
  dossier?: {
    companyOverview: string;
    industryContext: string;
    keyPainPoints: string[];
    techStack?: string[];
    companySize?: string;
    facilityIntelligence?: {
      estimatedYardCount: number;
      confidenceLevel: string;
      reasoning: string;
      networkBreakdown: {
        centralHub?: string;
        regionalCenters?: string[];
        localYards?: string[];
      };
      operationalScale: string;
    };
    strategicQuestions?: string[];
    manifestOpportunities?: string[];
    // Enhanced fields (Sprint 31B)
    talkingPoints?: string[];
    competitors?: string[];
    outreachAngles?: string[];
    manifestContext?: string;
  };
  error?: string;
  tokensUsed?: number;
}

export class AIDossierGenerator {
  private gemini: GeminiProClient;

  constructor(apiKey?: string) {
    this.gemini = new GeminiProClient(apiKey);
  }

  /**
   * Generate comprehensive company dossier
   */
  async generateDossier(accountId: string): Promise<DossierGenerationResult> {
    try {
      // Get company data
      const company = await prisma.target_accounts.findUnique({
        where: { id: accountId },
        include: {
          company_dossiers: true,
          people: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!company) {
        return {
          accountId,
          companyName: 'Unknown',
          success: false,
          error: 'Company not found',
        };
      }

      // Build context from existing data
      const context = this.buildCompanyContext(company);

      // Generate dossier using Gemini Pro
      // NOTE: This prompt generates the FRONTEND-COMPATIBLE format
      // that matches GTM-YardFlow's DossierPanel expectations
      const prompt = `You are a B2B sales intelligence analyst researching ${company.name} for the Manifest 2026 trade show.

COMPANY INFORMATION:
${context}

Generate a comprehensive company dossier in JSON format. This will be displayed in a sales dashboard, so be specific and actionable.

REQUIRED JSON STRUCTURE:
{
  "description": "2-3 paragraph overview of the company, their business model, and market position",
  "industryCategory": "Single category label (e.g., 'Logistics & Distribution', 'Manufacturing', 'Retail', '3PL', 'Transportation')",
  "facilityCount": "Estimated number as string (e.g., '12 facilities', '50+ locations', '3-5 yards')",
  "distributionFootprint": "Geographic scope (e.g., 'National', 'Regional - Southwest', 'Local - Texas', 'International')",
  "revenueEstimate": "Revenue range (e.g., '$10M-50M', '$100M-500M', '$1B+')",
  "isYardIntensive": true or false - Does this company likely have significant yard/dock/warehouse operations?,
  "yardPainPoints": [
    "Specific pain point related to yard management, dock scheduling, or trailer tracking",
    "Another operational challenge they likely face",
    "Third pain point - be specific to their industry"
  ],
  "talkingPoints": [
    "Conversation starter based on recent news, achievements, or industry trends",
    "Another talking point relevant to Manifest 2026 themes",
    "Third talking point for sales engagement"
  ],
  "competitors": ["Main competitor 1", "Competitor 2", "Competitor 3"],
  "decisionMakers": [
    "VP of Operations",
    "Director of Logistics",
    "Other likely decision-maker title for yard management solutions"
  ],
  "confidenceLevel": "high|medium|low - How confident are you in this research?",
  "sources": ["Industry knowledge", "Company profile analysis", "Market research"]
}

IMPORTANT GUIDELINES:
- isYardIntensive should be TRUE for: logistics, distribution, manufacturing, 3PL, trucking, warehousing, retail with DCs
- isYardIntensive should be FALSE for: software-only, professional services, pure e-commerce without fulfillment
- facilityCount should be a human-readable string, not just a number
- yardPainPoints must be SPECIFIC to yard/dock operations, not generic business challenges
- decisionMakers should be titles that would buy yard management software

Return ONLY valid JSON. No markdown, no explanation.`;

      const dossier = await this.gemini.generateJSON(prompt);

      return {
        accountId,
        companyName: company.name,
        success: true,
        dossier,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Dossier generation error for ${accountId}:`, error);
      return {
        accountId,
        companyName: 'Unknown',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build context string from company data
   */
  private buildCompanyContext(company: {
    name: string;
    website?: string | null;
    industry?: string | null;
    headquarters?: string | null;
    company_dossiers?: {
      companyOverview?: string | null;
      rawData?: string | null;
    } | null;
    people?: Array<{
      name: string;
      title?: string | null;
      email?: string | null;
      isExecOps?: boolean | null;
      isOps?: boolean | null;
      isProc?: boolean | null;
      isSales?: boolean | null;
    }>;
  }): string {
    const parts: string[] = [];

    parts.push(`Name: ${company.name}`);

    if (company.website) {
      parts.push(`Website: ${company.website}`);
    }

    if (company.industry) {
      parts.push(`Industry: ${company.industry}`);
    }

    if (company.headquarters) {
      parts.push(`Headquarters: ${company.headquarters}`);
    }

    if (company.company_dossiers?.companyOverview) {
      parts.push(`\nExisting Research:\n${company.company_dossiers.companyOverview}`);
    }

    if (company.company_dossiers?.rawData) {
      try {
        const rawData = JSON.parse(company.company_dossiers.rawData);
        if (rawData.employeeCount) {
          parts.push(`Employee Count: ${rawData.employeeCount}`);
        }
        if (rawData.foundedYear) {
          parts.push(`Founded: ${rawData.foundedYear}`);
        }
      } catch (_e) {
        // Ignore parse errors
      }
    }

    // Enhanced: Include known contacts with personas (Sprint 31B)
    if (company.people && company.people.length > 0) {
      parts.push(`\nKey Contacts (${company.people.length} tracked):`);
      const contactDetails = company.people.slice(0, 5).map((p) => {
        const personas = [
          p.isExecOps && 'ExecOps',
          p.isOps && 'Operations',
          p.isProc && 'Procurement',
          p.isSales && 'Sales',
        ].filter(Boolean);
        const personaStr = personas.length > 0 ? ` [${personas.join(', ')}]` : '';
        return `- ${p.name}${p.title ? ` - ${p.title}` : ''}${personaStr}`;
      });
      parts.push(contactDetails.join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * Save dossier to database
   */
  async saveDossier(accountId: string, dossier: DossierGenerationResult['dossier']): Promise<void> {
    if (!dossier) return;

    await prisma.company_dossiers.upsert({
      where: { accountId },
      create: {
        id: `gemini-${accountId}`,
        accountId,
        companyOverview: dossier.companyOverview,
        industryContext: dossier.industryContext,
        keyPainPoints: dossier.keyPainPoints.join('\n'),
        techStack: dossier.techStack?.join(', '),
        companySize: dossier.companySize,
        facilityCount: dossier.facilityIntelligence?.estimatedYardCount.toString(),
        operationalScale: dossier.facilityIntelligence?.operationalScale,
        // Enhanced fields (Sprint 31B)
        talkingPoints: dossier.talkingPoints ? JSON.stringify(dossier.talkingPoints) : null,
        competitors: dossier.competitors ? JSON.stringify(dossier.competitors) : null,
        outreachAngles: dossier.outreachAngles ? JSON.stringify(dossier.outreachAngles) : null,
        manifestContext: dossier.manifestContext,
        rawData: JSON.stringify({
          facilityIntelligence: dossier.facilityIntelligence,
          strategicQuestions: dossier.strategicQuestions,
          manifestOpportunities: dossier.manifestOpportunities,
          generatedBy: 'gemini-pro',
          generatedAt: new Date().toISOString(),
        }),
        researchedAt: new Date(),
        researchedBy: 'gemini-pro',
      },
      update: {
        companyOverview: dossier.companyOverview,
        industryContext: dossier.industryContext,
        keyPainPoints: dossier.keyPainPoints.join('\n'),
        techStack: dossier.techStack?.join(', '),
        companySize: dossier.companySize,
        facilityCount: dossier.facilityIntelligence?.estimatedYardCount.toString(),
        operationalScale: dossier.facilityIntelligence?.operationalScale,
        // Enhanced fields (Sprint 31B)
        talkingPoints: dossier.talkingPoints ? JSON.stringify(dossier.talkingPoints) : null,
        competitors: dossier.competitors ? JSON.stringify(dossier.competitors) : null,
        outreachAngles: dossier.outreachAngles ? JSON.stringify(dossier.outreachAngles) : null,
        manifestContext: dossier.manifestContext,
        rawData: JSON.stringify({
          facilityIntelligence: dossier.facilityIntelligence,
          strategicQuestions: dossier.strategicQuestions,
          manifestOpportunities: dossier.manifestOpportunities,
          generatedBy: 'gemini-pro',
          generatedAt: new Date().toISOString(),
        }),
        researchedAt: new Date(),
      },
    });
  }

  /**
   * Batch generate dossiers
   */
  async generateBatch(
    accountIds: string[],
    options: { dryRun?: boolean; delay?: number } = {}
  ): Promise<DossierGenerationResult[]> {
    const { dryRun = true, delay = 2000 } = options;
    const results: DossierGenerationResult[] = [];

    for (const accountId of accountIds) {
      try {
        const result = await this.generateDossier(accountId);
        results.push(result);

        if (!dryRun && result.success && result.dossier) {
          await this.saveDossier(accountId, result.dossier);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Batch dossier error for ${accountId}:`, error);
        results.push({
          accountId,
          companyName: 'Unknown',
          success: false,
          error: errorMessage,
        });
      }
    }

    return results;
  }
}
