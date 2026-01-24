/**
 * Sequence Engineer Agent - Dynamic Multi-Channel Campaigns
 * Sprint 32.4: Intelligent sequence blueprint generation
 *
 * Builds optimized outreach sequences based on:
 * - Persona type (ExecOps, Ops, Procurement, Sales)
 * - ICP score (determines sequence intensity)
 * - Campaign goal (meeting, demo, relationship)
 * - Engagement history (avoid over-contacting)
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { agentStateManager } from '@/lib/agents/state-manager';
import { contentHubClient } from '@/lib/yardflow-content-hub';
import type { OutreachChannel } from '@prisma/client';

export interface SequenceBlueprint {
  name: string;
  description: string;
  targetPersona: string;
  minIcpScore: number;
  steps: SequenceStep[];
}

export interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  channel: OutreachChannel;
  templateType: 'intro' | 'follow-up' | 'value-prop' | 'meeting-request';
  personalizationLevel: 'low' | 'medium' | 'high';
}

export class SequenceEngineerAgent {
  /**
   * Generate optimal sequence based on contact attributes
   * Enhanced with dynamic blueprint generation
   */
  async designSequence(input: {
    personId: string;
    campaignGoal: 'meeting' | 'demo' | 'relationship';
    urgency?: 'low' | 'medium' | 'high';
  }): Promise<SequenceBlueprint> {
    // Create agent task
    const task = await agentStateManager.createTask({
      agentType: 'sequence',
      contactId: input.personId,
      inputData: input,
      metadata: { goal: input.campaignGoal },
    });

    try {
      logger.info('Sequence engineer started', input);

      // Get person and account data
      const person = await prisma.people.findUnique({
        where: { id: input.personId },
        include: {
          target_accounts: {
            include: {
              company_dossiers: true,
            },
          },
          contact_insights: true,
          activities: {
            orderBy: { created_at: 'desc' },
            take: 10,
          },
        },
      });

      if (!person) {
        throw new Error('Person not found');
      }

      // Determine persona
      const persona = this.getPersonaLabel(person);
      const icpScore = person.target_accounts?.icpScore || 0;

      // Get industry-specific messaging
      let industryMessaging;
      try {
        industryMessaging = await contentHubClient.getBrandMessaging(persona);
      } catch (error) {
        logger.warn('Failed to fetch brand messaging', { error });
      }

      // Check engagement history to avoid over-contacting
      const recentContacts = person.activities.filter(
        (a) => a.type === 'EMAIL_SENT' || a.type === 'LINKEDIN_MESSAGE'
      );

      // Build dynamic blueprint
      const blueprint = this.buildDynamicBlueprint(
        persona,
        input.campaignGoal,
        icpScore,
        input.urgency || 'medium',
        recentContacts.length,
        industryMessaging
      );

      await agentStateManager.updateTaskStatus(task.id, 'completed', blueprint);

      logger.info('Sequence blueprint created', {
        personId: input.personId,
        steps: blueprint.steps.length,
        channels: [...new Set(blueprint.steps.map((s) => s.channel))],
      });

      return blueprint;
    } catch (error) {
      await agentStateManager.failTask(
        task.id,
        error instanceof Error ? error.message : 'Sequence design failed'
      );
      throw error;
    }
  }

  /**
   * Create sequence in database from blueprint
   */
  async createSequenceFromBlueprint(
    blueprint: SequenceBlueprint,
    campaignId?: string
  ): Promise<string> {
    // TODO: Implement sequence creation
    // 1. Create outreachSequence record
    // 2. Generate message templates for each step
    // 3. Set up delay timings
    // 4. Link to campaign if provided

    logger.warn('Sequence creation not yet implemented');
    return 'sequence-id-placeholder';
  }

  private buildDynamicBlueprint(
    persona: string,
    goal: string,
    icpScore: number,
    urgency: 'low' | 'medium' | 'high',
    recentContactCount: number,
    _industryMessaging: unknown
  ): SequenceBlueprint {
    const steps: SequenceStep[] = [];
    let stepNumber = 1;

    // Determine timing multiplier based on urgency
    const timingMultiplier = urgency === 'high' ? 0.5 : urgency === 'low' ? 1.5 : 1;

    // Step 1: Always start with personalized email
    steps.push({
      stepNumber: stepNumber++,
      delayHours: 0,
      channel: 'EMAIL',
      templateType: 'intro',
      personalizationLevel: icpScore > 70 ? 'high' : 'medium',
    });

    // Step 2: LinkedIn connection for ExecOps/Ops (they're more active on LinkedIn)
    if (persona === 'ExecOps' || persona === 'Ops') {
      steps.push({
        stepNumber: stepNumber++,
        delayHours: Math.round(48 * timingMultiplier),
        channel: 'LINKEDIN',
        templateType: 'follow-up',
        personalizationLevel: 'medium',
      });
    }

    // Step 3: Value proposition email (adjusted timing)
    steps.push({
      stepNumber: stepNumber++,
      delayHours: Math.round((persona === 'ExecOps' ? 72 : 48) * timingMultiplier),
      channel: 'EMAIL',
      templateType: 'value-prop',
      personalizationLevel: 'high',
    });

    // Step 4: Manifest meeting request for high-value accounts (ICP > 70)
    if (icpScore > 70 && goal === 'meeting') {
      steps.push({
        stepNumber: stepNumber++,
        delayHours: Math.round(96 * timingMultiplier),
        channel: 'MANIFEST',
        templateType: 'meeting-request',
        personalizationLevel: 'high',
      });
    }

    // Step 5: Final touchpoint (email or phone based on persona)
    if (recentContactCount < 5) {
      // Don't add too many touches if already contacted recently
      steps.push({
        stepNumber: stepNumber++,
        delayHours: Math.round(168 * timingMultiplier), // 1 week
        channel: persona === 'ExecOps' ? 'PHONE' : 'EMAIL',
        templateType: 'meeting-request',
        personalizationLevel: 'high',
      });
    }

    return {
      name: `${persona} - ${goal} (ICP: ${icpScore})`,
      description: `Dynamically generated ${steps.length}-step sequence for ${persona} persona with ${urgency} urgency`,
      targetPersona: persona,
      minIcpScore: icpScore,
      steps,
    };
  }

  private getPersonaLabel(person: unknown): string {
    const p = person as Record<string, unknown>;
    if (p.isExecOps) return 'ExecOps';
    if (p.isOps) return 'Ops';
    if (p.isProc) return 'Procurement';
    if (p.isSales) return 'Sales';
    if (p.isTech) return 'Tech';
    return 'Unknown';
  }
}
