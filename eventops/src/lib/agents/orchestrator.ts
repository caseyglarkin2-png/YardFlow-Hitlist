/**
 * Agent Orchestrator
 * Coordinates multiple agents to execute complex GTM workflows
 * 
 * Sprint S1: Complete orchestration with Steps 3-5
 */

import { prisma } from '@/lib/db';
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

export interface WorkflowStatus {
  found: boolean;
  workflowId?: string;
  status?: string;
  progress?: number;
  steps?: Array<{
    step: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    error: string | null;
  }>;
  startedAt?: Date | null;
  completedAt?: Date | null;
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

        // Retrieve discovered accounts
        // For Golden Build: We assume prospecting populates the database
        // and we fetch the most recent companies for this event
        try {
           const recentCompanies = await prisma.companies.findMany({
             where: { 
               // Assuming 'tags' or similar links to event, or just simple fetch
               // For now, simpler: just don't crash if 0 found
               created_at: { gt: new Date(Date.now() - 1000 * 60 * 60) } // Last hour
             },
             select: { id: true },
             take: 10
           });
           params.targetAccounts = recentCompanies.map(c => c.id);
           logger.info('Auto-discovered accounts', { count: params.targetAccounts.length });
        } catch (dbError) {
           logger.warn('Failed to retrieve auto-discovered accounts', { error: dbError });
           params.targetAccounts = []; 
        }
      }

      // Ensure no crash if still empty
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

      // Step 3: Design sequences for contacts at each account
      for (const accountId of targetAccounts) {
        // Get contacts for this account
        const contacts = await prisma.people.findMany({
          where: { accountId },
          take: 5, // Limit to top 5 contacts per account
        });

        for (const contact of contacts) {
          const sequenceTask = await this.executeTask({
            id: '',
            agentType: 'sequence-engineer',
            input: {
              personId: contact.id,
              campaignGoal: params.campaignType === 'booth-outreach' ? 'meeting' : 'relationship',
              urgency: params.campaignType === 'pre-event' ? 'high' : 'medium',
            },
            status: 'pending',
            parentTaskId: rootTask.id,
          });
          workflow.tasks.push(sequenceTask);
        }
      }

      // Step 4: Generate content for the campaign
      const contentTask = await this.executeTask({
        id: '',
        agentType: 'content-purposing',
        input: {
          persona: 'operations-executive',
          industry: 'logistics',
          campaignGoal: params.campaignType === 'booth-outreach' ? 'decision' : 'consideration',
          contentType: 'email-template',
        },
        status: 'pending',
        parentTaskId: rootTask.id,
      });
      workflow.tasks.push(contentTask);

      // Step 5: Create social media campaign (non-blocking)
      try {
        const socialsTask = await this.executeTask({
          id: '',
          agentType: 'socials',
          input: {
            platform: 'linkedin',
            content: `Excited for ${params.eventId}! Stop by to learn how YardFlow is transforming yard operations.`,
            hashtags: ['yardmanagement', 'logistics', 'supplychain'],
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          },
          status: 'pending',
          parentTaskId: rootTask.id,
        });
        workflow.tasks.push(socialsTask);
      } catch (socialsError) {
        // Socials is non-critical, log and continue
        logger.warn('Socials task failed, continuing workflow', { error: socialsError });
      }

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
          // Validated for Golden Build G2.2
          output = await this.contentPurposing.purposeContent(
            task.input as Parameters<typeof this.contentPurposing.purposeContent>[0],
            undefined, // accountId (optional)
            task.parentTaskId
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
   * Get workflow status from database
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    try {
      // Fetch the root task and its children
      const rootTask = await prisma.agent_tasks.findUnique({
        where: { id: workflowId },
        include: {
          childTasks: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!rootTask) {
        return { found: false };
      }

      // Build step status array
      const steps = rootTask.childTasks.map((task) => ({
        step: task.agentType,
        status: task.status,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        error: task.errorMessage,
      }));

      // Calculate progress
      const total = rootTask.childTasks.length || 1;
      const completed = rootTask.childTasks.filter(
        (t) => t.status === 'completed'
      ).length;
      const progress = Math.round((completed / total) * 100);

      return {
        found: true,
        workflowId: rootTask.id,
        status: rootTask.status,
        progress,
        steps,
        startedAt: rootTask.startedAt,
        completedAt: rootTask.completedAt,
      };
    } catch (error) {
      logger.error('Failed to get workflow status', { error, workflowId });
      return { found: false };
    }
  }

  /**
   * Retry a failed task within a workflow
   */
  async retryFailedStep(workflowId: string, taskId: string): Promise<AgentTask | null> {
    try {
      // Find the failed task
      const task = await prisma.agent_tasks.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        logger.warn('Task not found for retry', { taskId });
        return null;
      }

      if (task.status !== 'failed') {
        logger.warn('Task is not in failed state', { taskId, status: task.status });
        return null;
      }

      if (task.retryCount >= task.maxRetries) {
        logger.warn('Task has exceeded max retries', { 
          taskId, 
          retryCount: task.retryCount, 
          maxRetries: task.maxRetries 
        });
        return null;
      }

      // Increment retry count and reset status
      await prisma.agent_tasks.update({
        where: { id: taskId },
        data: {
          status: 'pending',
          retryCount: { increment: 1 },
          errorMessage: null,
          startedAt: null,
          completedAt: null,
        },
      });

      // Re-execute the task
      const agentTask: AgentTask = {
        id: task.id,
        agentType: task.agentType,
        input: task.inputData as Record<string, unknown>,
        status: 'pending',
        parentTaskId: task.parentTaskId || undefined,
      };

      const result = await this.executeTask(agentTask);

      logger.info('Task retry completed', { 
        taskId, 
        status: result.status,
        retryCount: task.retryCount + 1 
      });

      return result;
    } catch (error) {
      logger.error('Failed to retry task', { error, workflowId, taskId });
      return null;
    }
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
