/**
 * Research Agent
 * Generates comprehensive company dossiers and competitive intelligence
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateCompanyResearch } from '@/lib/ai-research';
import { GeminiProClient } from '@/lib/ai/gemini-client';

export interface ResearchInput {
  accountId: string;
  deepDive?: boolean; // If true, fetch additional sources
  sources?: ('gemini' | 'linkedin' | 'wikipedia' | 'web')[];
}

export interface CompanyDossier {
  companyOverview: string;
  recentNews: string;
  industryContext: string;
  keyPainPoints: string;
  techStack?: string;
  companySize: string;
  socialPresence?: string;
  facilityCount?: string;
  locations?: string;
  operationalScale?: string;
  competitiveIntel?: string;
}

export class ResearchAgent {
  private gemini: GeminiProClient;

  constructor() {
    this.gemini = new GeminiProClient();
  }

  /**
   * Generate comprehensive research dossier for an account
   */
  async generateDossier(input: ResearchInput): Promise<CompanyDossier> {
    logger.info('Research agent started', { accountId: input.accountId });

    // Get account details
    const account = await prisma.target_accounts.findUnique({
      where: { id: input.accountId },
      include: { people: true },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Use existing AI research function as base
    const baseResearch = await generateCompanyResearch(
      account.name,
      account.website || undefined
    );

    // TODO: If deepDive enabled, fetch additional sources
    // 1. LinkedIn company page scraping
    // 2. Wikipedia for public companies
    // 3. News articles via SerpAPI
    // 4. Competitive intelligence

    // Save to database
    await prisma.company_dossiers.upsert({
      where: { accountId: input.accountId },
      create: {
        id: crypto.randomUUID(),
        accountId: input.accountId,
        ...baseResearch,
        rawData: JSON.stringify(baseResearch),
      },
      update: {
        ...baseResearch,
        rawData: JSON.stringify(baseResearch),
        researchedAt: new Date(),
      },
    });

    logger.info('Research dossier generated', { accountId: input.accountId });
    return baseResearch as CompanyDossier;
  }

  /**
   * Update existing dossier with new intel
   */
  async enrichDossier(accountId: string, additionalIntel: Partial<CompanyDossier>): Promise<void> {
    const existing = await prisma.company_dossiers.findUnique({
      where: { accountId },
    });

    if (!existing) {
      throw new Error('Dossier not found. Generate first before enriching.');
    }

    // Merge with existing data
    await prisma.company_dossiers.update({
      where: { accountId },
      data: {
        ...additionalIntel,
        researchedAt: new Date(),
      },
    });

    logger.info('Dossier enriched', { accountId });
  }
}
