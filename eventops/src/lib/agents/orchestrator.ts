/**
 * Agent Orchestrator
 * Coordinates multiple agents to execute complex GTM workflows
 */

import { logger } from '@/lib/logger';
import { ProspectingAgent } from './prospecting-agent';
import { ResearchAgent } from './research-agent';
import { SequenceEngineerAgent } from './sequence-engineer-agent';
import { ContentPurposingAgent } from './content-purposing-agent';
import { GraphicsAgent } from './graphics-agent';
import { SocialsAgent } from './socials-agent';
import { ContractingAgent } from './contracting-agent';

export interface CampaignWorkflow {
  id: string;
  name: string;
  tasks: AgentTask[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: {
    completed: number;
    total: number;
  };
}

export interface AgentTask {
  id: string;
  agentType: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class AgentOrchestrator {
  private prospecting: ProspectingAgent;
  private research: ResearchAgent;
  private sequenceEngineer: SequenceEngineerAgent;
  private contentPurposing: ContentPurposingAgent;
  private graphics: GraphicsAgent;
  private socials: SocialsAgent;
  private contracting: ContractingAgent;

  constructor() {
    this.prospecting = new ProspectingAgent();
    this.research = new ResearchAgent();
    this.sequenceEngineer = new SequenceEngineerAgent();
    this.contentPurposing = new ContentPurposingAgent();
    this.graphics = new GraphicsAgent();
    this.socials = new SocialsAgent();
    this.contracting = new ContractingAgent();
  }

  /**
   * Execute workflow (wrapper for runFullCampaign)
   * Used by API routes for consistency
   */
  async executeWorkflow(params: {
    type: string;
    accountId: string;
    contactIds?: string[];
    config?: Record<string, unknown>;
  }): Promise<CampaignWorkflow> {
    // Map workflow type to campaign type
    const campaignTypeMap: Record<string, 'booth-outreach' | 'pre-event' | 'post-event'> = {
      'full-campaign': 'pre-event',
      'quick-outreach': 'booth-outreach',
      'research-only': 'post-event',
    };

    return this.runFullCampaign({
      eventId: params.accountId, // TODO: Get proper eventId
      targetAccounts: [params.accountId],
      campaignType: campaignTypeMap[params.type] || 'pre-event',
    });
  }

  /**
   * Run full campaign: Prospecting → Research → Sequences → Outreach
   */
  async runFullCampaign(params: {
    eventId: string;
    targetAccounts?: string[];
    campaignType: 'booth-outreach' | 'pre-event' | 'post-event';
  }): Promise<CampaignWorkflow> {
    logger.info('Starting full campaign orchestration', params);

    const workflow: CampaignWorkflow = {
      id: crypto.randomUUID(),
      name: `${params.campaignType} - ${params.eventId}`,
      tasks: [],
      status: 'in-progress',
      progress: { completed: 0, total: 0 },
    };

    try {
      // Step 1: Discover new leads (if no target accounts provided)
      if (!params.targetAccounts || params.targetAccounts.length === 0) {
        const prospectingTask = await this.executeTask({
          id: crypto.randomUUID(),
          agentType: 'prospecting',
          input: { eventId: params.eventId },
          status: 'pending',
        });
        workflow.tasks.push(prospectingTask);

        // Use discovered leads as target accounts
        params.targetAccounts = prospectingTask.output?.accountIds || [];
      }

      // Step 2: Research each account
      const targetAccounts = params.targetAccounts || [];
      for (const accountId of targetAccounts) {
        const researchTask = await this.executeTask({
          id: crypto.randomUUID(),
          agentType: 'research',
          input: { accountId },
          status: 'pending',
        });
        workflow.tasks.push(researchTask);
      }

      // Step 3: Design sequences for contacts
      // TODO: Get contacts for each account and design sequences

      // Step 4: Generate content
      // TODO: Use content purposing agent for campaign materials

      // Step 5: Create social media campaign
      // TODO: Plan and schedule social posts

      workflow.status = 'completed';
      workflow.progress = { completed: workflow.tasks.length, total: workflow.tasks.length };

      logger.info('Campaign orchestration completed', {
        workflowId: workflow.id,
        tasksCompleted: workflow.tasks.length,
      });

      return workflow;
    } catch (error) {
      logger.error('Campaign orchestration failed', { error, workflowId: workflow.id });
      workflow.status = 'failed';
      return workflow;
    }
  }

  /**
   * Execute single agent task
   */
  private async executeTask(task: AgentTask): Promise<AgentTask> {
    task.status = 'in-progress';
    task.startedAt = new Date();

    try {
      switch (task.agentType) {
        case 'prospecting':
          task.output = await this.prospecting.discoverLeads(task.input);
          break;

        case 'research':
          task.output = await this.research.generateDossier(task.input);
          break;

        case 'sequence-engineer':
          task.output = await this.sequenceEngineer.designSequence(task.input);
          break;

        case 'content-purposing':
          task.output = await this.contentPurposing.purposeContent(task.input);
          break;

        case 'graphics':
          task.output = await this.graphics.generateGraphic(task.input);
          break;

        case 'socials':
          task.output = await this.socials.schedulePost(task.input);
          break;

        case 'contracting':
          task.output = await this.contracting.generateContract(task.input);
          break;

        default:
          throw new Error(`Unknown agent type: ${task.agentType}`);
      }

      task.status = 'completed';
      task.completedAt = new Date();
    } catch (error) {
      logger.error('Agent task failed', { error, task });
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.completedAt = new Date();
    }

    return task;
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(_workflowId: string): Promise<CampaignWorkflow | null> {
    // TODO: Fetch from database
    // For now, return null
    return null;
  }
}

// Export singleton getter for lazy initialization
let orchestratorInstance: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}
