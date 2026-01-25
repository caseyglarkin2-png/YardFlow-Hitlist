/**
 * Agent Orchestrator
 * Coordinates multiple agents to execute complex GTM workflows
 */

import { logger } from '@/lib/logger';
import { agentStateManager } from '@/lib/agents/state-manager';
import { ProspectingAgent, ProspectingCriteria } from './prospecting-agent';
import { ResearchAgent, ResearchInput } from './research-agent';
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
  parentTaskId?: string;
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

    // Create a Root Task for the workflow
    // Note: 'campaign' or 'orchestrator' type needs to be supported in AgentType if using strict types
    // but for now we'll rely on the loose string in Prisma
    const rootTask = await agentStateManager.createTask({
      agentType: 'sequence', // Using 'sequence' as a proxy for high-level flow for now, or just 'orchestrator' if schema allows string
      inputData: params as unknown as Record<string, unknown>,
      accountId: params.targetAccounts?.[0], // Link to first account if available
    });

    await agentStateManager.updateTaskStatus(rootTask.id, 'in_progress');

    const workflow: CampaignWorkflow = {
      id: rootTask.id,
      name: `${params.campaignType} - ${params.eventId}`,
      tasks: [],
      status: 'in-progress',
      progress: { completed: 0, total: 0 },
    };

    try {
      // Step 1: Discover new leads (if no target accounts provided)
      if (!params.targetAccounts || params.targetAccounts.length === 0) {
        const prospectingTask = await this.executeTask({
          id: '', // Will be set by agent
          agentType: 'prospecting',
          input: { eventId: params.eventId },
          status: 'pending',
          parentTaskId: rootTask.id,
        });
        workflow.tasks.push(prospectingTask);

        // TODO: Retrieve discovered accounts from DB/Task output
        // const prospectOutput = prospectingTask.output as { accountIds?: string[] } | undefined;
        // params.targetAccounts = prospectOutput?.accountIds || [];
      }

      // Step 2: Research each account
      const targetAccounts = params.targetAccounts || [];
      for (const accountId of targetAccounts) {
        const researchTask = await this.executeTask({
          id: '',
          agentType: 'research',
          input: { accountId },
          status: 'pending',
          parentTaskId: rootTask.id,
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

      await agentStateManager.updateTaskStatus(rootTask.id, 'completed');

      logger.info('Campaign orchestration completed', {
        workflowId: workflow.id,
        tasksCompleted: workflow.tasks.length,
      });

      return workflow;
    } catch (error) {
      logger.error('Campaign orchestration failed', { error, workflowId: workflow.id });
      workflow.status = 'failed';
      await agentStateManager.updateTaskStatus(
        rootTask.id,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return workflow;
    }
  }

  /**
   * Execute single agent task with State Manager integration
   */
  private async executeTask(task: AgentTask): Promise<AgentTask> {
    task.status = 'in-progress';
    task.startedAt = new Date();

    try {
      let output: unknown;
      let taskId = task.id;

      switch (task.agentType) {
        case 'prospecting':
          // ProspectingAgent.run now returns taskId and handles state updates
          taskId = await this.prospecting.run(task.input as ProspectingCriteria, task.parentTaskId);
          output = { message: 'Prospecting completed', taskId };
          break;

        case 'research':
          // ResearchAgent.generateDossier handles state updates but returns data
          // We need to capture the task ID if we want to link it properly in the Workflow object
          // But generateDossier returns CompanyDossier.
          // For now, we accept we might not get the child taskId easily without structured returns.
          // However, the child task IS created in DB with parentTaskId.
          output = await this.research.generateDossier(
            task.input as ResearchInput,
            task.parentTaskId
          );
          break;

        case 'sequence-engineer':
          output = await this.sequenceEngineer.designSequence(task.input as any, task.parentTaskId);
          break;

        case 'content-purposing':
          output = await this.contentPurposing.purposeContent(
            task.input as Parameters<typeof this.contentPurposing.purposeContent>[0]
          );
          break;

        case 'graphics':
          output = await this.graphics.generateGraphic(
            task.input as Parameters<typeof this.graphics.generateGraphic>[0]
          );
          break;

        case 'socials':
          output = await this.socials.schedulePost(
            task.input as Parameters<typeof this.socials.schedulePost>[0]
          );
          break;

        case 'contracting':
          output = await this.contracting.generateContract(
            task.input as Parameters<typeof this.contracting.generateContract>[0]
          );
          break;

        default:
          throw new Error(`Unknown agent type: ${task.agentType}`);
      }

      task.id = taskId || task.id; // Update ID if available
      task.output = output;
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
