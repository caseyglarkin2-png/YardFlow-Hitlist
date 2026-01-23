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
      const prompt = `You are a B2B sales intelligence analyst researching ${company.name} for a trade show (Manifest 2026).

COMPANY INFORMATION:
${context}

Generate a comprehensive company dossier in JSON format with the following structure:

{
  "companyOverview": "2-3 paragraph overview of the company, their business model, and market position",
  "industryContext": "Analysis of their industry, market trends, and competitive landscape",
  "keyPainPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "techStack": ["likely technology 1", "likely technology 2"],
  "companySize": "estimate (e.g., 'Enterprise (500-1000 employees)' or 'Mid-market (100-500)')",
  "facilityIntelligence": {
    "estimatedYardCount": <number>,
    "confidenceLevel": "high|medium|low",
    "reasoning": "explanation of yard count estimate based on company info",
    "networkBreakdown": {
      "centralHub": "likely main hub location",
      "regionalCenters": ["regional center 1", "regional center 2"],
      "localYards": ["local yard 1", "local yard 2", "etc"]
    },
    "operationalScale": "description of their operational footprint"
  },
  "strategicQuestions": ["question to ask at booth 1", "question 2", "question 3"],
  "manifestOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"]
}

Focus on actionable intelligence for trade show conversations. Estimate facility counts based on:
- Company size and revenue
- Industry norms for their sector
- Geographic presence
- Number of employees
- Operational indicators

Be specific and practical. Return ONLY valid JSON.`;

      const dossier = await this.gemini.generateJSON(prompt);

      return {
        accountId,
        companyName: company.name,
        success: true,
        dossier,
      };
    } catch (error: any) {
      console.error(`Dossier generation error for ${accountId}:`, error);
      return {
        accountId,
        companyName: 'Unknown',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build context string from company data
   */
  private buildCompanyContext(company: any): string {
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
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (company.people && company.people.length > 0) {
      parts.push(`\nKey Contacts: ${company.people.length} people tracked`);
      parts.push(`Sample roles: ${company.people.slice(0, 3).map((p: any) => p.title || p.name).join(', ')}`);
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
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error: any) {
        console.error(`Batch dossier error for ${accountId}:`, error);
        results.push({
          accountId,
          companyName: 'Unknown',
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}
