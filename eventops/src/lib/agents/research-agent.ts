/**
 * Research Agent - Enhanced Multi-Source Intelligence
 * Sprint 32.3: Research Agent Enhancement
 *
 * Generates comprehensive company dossiers from multiple sources:
 * - Gemini AI analysis
 * - YardFlow Content Hub (case studies, industry context)
 * - LinkedIn company pages (future)
 * - News sources (future)
 * - Database historical data
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateCompanyResearch } from '@/lib/ai-research';
import { GeminiProClient } from '@/lib/ai/gemini-client';
import { contentHubClient } from '@/lib/yardflow-content-hub';
import { agentStateManager } from '@/lib/agents/state-manager';
import { cacheGet, cacheSet } from '@/lib/redis-cache';

export interface ResearchInput {
  accountId: string;
  deepDive?: boolean; // If true, fetch additional sources
  sources?: ('gemini' | 'content-hub' | 'linkedin' | 'news' | 'database')[];
  refreshCache?: boolean; // Force refresh even if cached
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
   * Enhanced with multi-source data aggregation
   */
  async generateDossier(input: ResearchInput): Promise<CompanyDossier> {
    // Create agent task for tracking
    const task = await agentStateManager.createTask({
      agentType: 'research',
      accountId: input.accountId,
      inputData: {
        ...input,
        sources: input.sources || ['gemini', 'content-hub', 'database'],
      },
    });

    try {
      logger.info('Research agent started (enhanced)', {
        accountId: input.accountId,
        deepDive: input.deepDive,
      });

      // Check cache first (unless refresh requested)
      if (!input.refreshCache) {
        const cached = await cacheGet<CompanyDossier>(`dossier:${input.accountId}`);
        if (cached) {
          logger.info('Returning cached dossier', { accountId: input.accountId });
          await agentStateManager.updateTaskStatus(task.id, 'completed', { cached: true });
          return cached;
        }
      }

      // Get account details
      const account = await prisma.target_accounts.findUnique({
        where: { id: input.accountId },
        include: {
          people: true,
          company_dossiers: true,
        },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Source 1: Gemini AI analysis (base research)
      const baseResearch = await generateCompanyResearch(
        account.name,
        account.website || undefined
      );

      // Source 2: YardFlow Content Hub - Industry case studies
      let caseStudyContext = '';
      if (input.sources?.includes('content-hub') || input.deepDive) {
        try {
          const caseStudies = await contentHubClient.getCaseStudies(
            account.industry || 'logistics'
          );
          if (caseStudies && caseStudies.length > 0) {
            caseStudyContext = `\n\nIndustry Case Studies:\n${caseStudies
              .slice(0, 2)
              .map((cs) => `- ${cs.title}: ${cs.challenge}`)
              .join('\n')}`;
          }
        } catch (error) {
          logger.warn('Failed to fetch case studies', { error });
        }
      }

      // Source 3: Database historical data
      const activityCount = await prisma.activities.count({
        where: {
          person: {
            account_id: input.accountId,
          },
        },
      });

      const engagementHistory =
        activityCount > 0 ? `\n\nEngagement History: ${activityCount} interactions` : '';

      // Source 4: Deep dive enhancements (future)
      if (input.deepDive) {
        // TODO: LinkedIn scraping, news articles, competitive intel
        logger.info('Deep dive requested (future feature)', { accountId: input.accountId });
      }

      // Combine all sources into enriched dossier
      const enrichedDossier: CompanyDossier = {
        ...baseResearch,
        industryContext: baseResearch.industryContext + caseStudyContext,
        keyPainPoints: baseResearch.keyPainPoints + engagementHistory,
      };

      // Save to database
      await prisma.company_dossiers.upsert({
        where: { accountId: input.accountId },
        create: {
          id: crypto.randomUUID(),
          accountId: input.accountId,
          ...enrichedDossier,
          rawData: JSON.stringify({ ...enrichedDossier, sources: input.sources }),
        },
        update: {
          ...enrichedDossier,
          rawData: JSON.stringify({ ...enrichedDossier, sources: input.sources }),
          researchedAt: new Date(),
        },
      });

      // Cache for 24 hours
      await cacheSet(`dossier:${input.accountId}`, enrichedDossier, 86400);

      await agentStateManager.updateTaskStatus(task.id, 'completed', enrichedDossier);

      logger.info('Research dossier generated (enhanced)', {
        accountId: input.accountId,
        sources: input.sources?.length || 3,
      });

      return enrichedDossier;
    } catch (error) {
      await agentStateManager.failTask(
        task.id,
        error instanceof Error ? error.message : 'Research failed'
      );
      throw error;
    }
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
