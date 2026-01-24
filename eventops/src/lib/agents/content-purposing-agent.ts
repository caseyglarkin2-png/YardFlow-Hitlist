/**
 * Content Purposing Agent
 * Adapts YardFlow marketing assets to personalized outreach campaigns
 *
 * Enhanced with:
 * - YardFlow Content Hub integration
 * - Redis caching for performance
 * - Fallback to local templates
 */

import { logger } from '@/lib/logger';
import { contentHubClient, type CaseStudy, type MessagingGuide } from '@/lib/yardflow-content-hub';
import { agentStateManager } from './state-manager';

const CONTENT_HUB_BASE = 'https://flow-state-klbt.vercel.app/api';

export interface ContentRequest {
  persona: string;
  industry?: string;
  campaignGoal: 'awareness' | 'consideration' | 'decision';
  contentType: 'case-study' | 'roi-calculator' | 'email-template' | 'social-post';
}

export interface PurposedContent {
  original: any;
  personalized: string;
  metadata: {
    source: string;
    adaptations: string[];
  };
}

/**
 * Content Purposing Agent - Adapts marketing assets for personalized outreach
 * Now uses content hub client with Redis caching
 */
export class ContentPurposingAgent {
  /**
   * Purpose content from YardFlow hub for specific use case
   */
  async purposeContent(request: ContentRequest, accountId?: string): Promise<PurposedContent> {
    logger.info('Content purposing agent started', { request, accountId });

    // Create agent task for tracking
    const task = accountId
      ? await agentStateManager.createTask({
          agentType: 'content',
          inputData: request,
          accountId,
        })
      : null;

    try {
      if (task) {
        await agentStateManager.updateTaskStatus(task.id, 'in_progress');
      }

      let original: any;
      let personalized: string;
      const adaptations: string[] = [];

      switch (request.contentType) {
        case 'case-study':
          const caseStudies = await contentHubClient.getCaseStudies(
            request.industry || 'logistics'
          );
          original = caseStudies[0] || this.getDefaultCaseStudy();
          personalized = this.adaptCaseStudy(original, request.persona);
          adaptations.push('persona-specific pain points', 'industry terminology');
          break;

        case 'roi-calculator':
          original = await this.fetchROITemplate();
          personalized = this.adaptROICalculator(original, request.persona);
          adaptations.push('persona-specific assumptions', 'value prop framing');
          break;

        case 'email-template':
          const messaging = await contentHubClient.getBrandMessaging(request.persona);
          original = messaging || this.getDefaultMessaging();
          personalized = this.adaptEmailTemplate(original, request.campaignGoal);
          adaptations.push('campaign goal alignment', 'CTA optimization');
          break;

        case 'social-post':
          const socialTemplates = await contentHubClient.getSocialTemplates('linkedin');
          original = socialTemplates[0] || this.getDefaultSocialTemplate();
          personalized = this.adaptSocialPost(original, request.industry);
          adaptations.push('industry hashtags', 'platform optimization');
          break;

        default:
          throw new Error(`Unknown content type: ${request.contentType}`);
      }

      const result = {
        original,
        personalized,
        metadata: {
          source: CONTENT_HUB_BASE,
          adaptations,
          confidence: 0.85,
        },
      };

      if (task) {
        await agentStateManager.updateTaskStatus(task.id, 'completed', result);
      }

      return result;
    } catch (error) {
      if (task) {
        await agentStateManager.failTask(
          task.id,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      throw error;
    }
  }

  private async fetchCaseStudy(industry: string): Promise<any> {
    try {
      const response = await fetch(`${CONTENT_HUB_BASE}/case-studies?industry=${industry}`);
      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch case study', { error, industry });
      return { placeholder: true, industry };
    }
  }

  private async fetchROITemplate(): Promise<any> {
    try {
      const response = await fetch(`${CONTENT_HUB_BASE}/roi/template`);
      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch ROI template', { error });
      return { placeholder: true };
    }
  }

  private async fetchEmailTemplate(persona: string): Promise<any> {
    try {
      const response = await fetch(`${CONTENT_HUB_BASE}/messaging/${persona}`);
      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch email template', { error, persona });
      return { placeholder: true, persona };
    }
  }

  private async fetchSocialTemplate(persona: string): Promise<any> {
    try {
      const response = await fetch(`${CONTENT_HUB_BASE}/social/${persona}`);
      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch social template', { error, persona });
      return { placeholder: true, persona };
    }
  }

  private adaptCaseStudy(original: any, persona: string): string {
    // TODO: Implement AI-powered adaptation
    // 1. Extract key metrics relevant to persona
    // 2. Reframe pain points in persona's language
    // 3. Highlight ROI metrics that matter most to persona
    return JSON.stringify({ ...original, adaptedFor: persona });
  }

  private adaptROICalculator(original: any, persona: string): string {
    // TODO: Adjust assumptions and multipliers based on persona
    return JSON.stringify({ ...original, personaMultiplier: persona });
  }

  private adaptEmailTemplate(original: any, goal: string): string {
    // TODO: Adjust CTA and urgency based on campaign goal
    return JSON.stringify({ ...original, optimizedFor: goal });
  }

  private adaptSocialPost(original: any, industry?: string): string {
    // TODO: Add industry-specific hashtags and context
    return JSON.stringify({ ...original, industry });
  }

  // Default fallback content when external API unavailable
  private getDefaultCaseStudy(): any {
    return {
      title: 'Logistics Efficiency Case Study',
      content: 'Sample case study content',
      industry: 'logistics',
    };
  }

  private getDefaultMessaging(): any {
    return {
      subject: 'Improve Your Operations',
      body: 'Sample messaging content',
    };
  }

  private getDefaultSocialTemplate(): any {
    return {
      platform: 'linkedin',
      content: 'Sample social post template',
    };
  }
}
