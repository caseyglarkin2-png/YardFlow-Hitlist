import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Agent State Manager
 *
 * Manages persistent state for AI agent tasks across workflow executions.
 * Enables:
 * - Task tracking and history
 * - Workflow checkpoints and retry logic
 * - Multi-agent coordination
 * - Performance monitoring
 */

export type AgentType =
  | 'prospecting'
  | 'research'
  | 'sequence'
  | 'content'
  | 'graphics'
  | 'socials'
  | 'contracting';

export type AgentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface AgentTaskInput {
  agentType: AgentType;
  inputData: Record<string, unknown>;
  accountId?: string;
  contactId?: string;
  parentTaskId?: string;
  maxRetries?: number;
}

export interface AgentTaskResult {
  id: string;
  agentType: AgentType;
  status: AgentTaskStatus;
  inputData: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  accountId?: string;
  contactId?: string;
  parentTaskId?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowStatus {
  workflowId: string;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  overallStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  tasks: AgentTaskResult[];
}

export class AgentStateManager {
  /**
   * Create a new agent task.
   */
  async createTask(input: AgentTaskInput): Promise<AgentTaskResult> {
    logger.info('Creating agent task', {
      agentType: input.agentType,
      accountId: input.accountId,
      parentTaskId: input.parentTaskId,
    });

    const task = await prisma.agent_tasks.create({
      data: {
        agentType: input.agentType,
        inputData: input.inputData as any,
        accountId: input.accountId,
        contactId: input.contactId,
        parentTaskId: input.parentTaskId,
        maxRetries: input.maxRetries ?? 3,
        status: 'pending',
      },
    });

    logger.info('Agent task created', { taskId: task.id });

    return this.mapTaskToResult(task);
  }

  /**
   * Update task status and optionally set output/error.
   */
  async updateTaskStatus(
    taskId: string,
    status: AgentTaskStatus,
    output?: Record<string, any>,
    error?: string
  ): Promise<AgentTaskResult> {
    logger.info('Updating agent task status', { taskId, status });

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'in_progress' && !output && !error) {
      updateData.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (output) {
      updateData.outputData = output as object;
    }

    if (error) {
      updateData.errorMessage = error;
    }

    const task = await prisma.agent_tasks.update({
      where: { id: taskId },
      data: updateData,
    });

    logger.info('Agent task updated', { taskId, status });

    return this.mapTaskToResult(task);
  }

  /**
   * Mark task as failed and potentially retry.
   */
  async failTask(
    taskId: string,
    error: string
  ): Promise<{ shouldRetry: boolean; task: AgentTaskResult }> {
    const task = await prisma.agent_tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const newRetryCount = task.retryCount + 1;
    const shouldRetry = newRetryCount < task.maxRetries;

    logger.warn('Agent task failed', {
      taskId,
      error,
      retryCount: newRetryCount,
      maxRetries: task.maxRetries,
      shouldRetry,
    });

    const updatedTask = await prisma.agent_tasks.update({
      where: { id: taskId },
      data: {
        status: shouldRetry ? 'pending' : 'failed',
        errorMessage: error,
        retryCount: newRetryCount,
        updatedAt: new Date(),
        completedAt: shouldRetry ? null : new Date(),
      },
    });

    return {
      shouldRetry,
      task: this.mapTaskToResult(updatedTask),
    };
  }

  /**
   * Get task history for an account.
   */
  async getTaskHistory(accountId: string, limit: number = 50): Promise<AgentTaskResult[]> {
    const tasks = await prisma.agent_tasks.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return tasks.map(this.mapTaskToResult);
  }

  /**
   * Get all tasks in a workflow (parent task + children).
   */
  async getWorkflowTasks(parentTaskId: string): Promise<AgentTaskResult[]> {
    const tasks = await prisma.agent_tasks.findMany({
      where: {
        OR: [{ id: parentTaskId }, { parentTaskId }],
      },
      orderBy: { createdAt: 'asc' },
    });

    return tasks.map(this.mapTaskToResult);
  }

  /**
   * Get workflow status summary.
   */
  async getWorkflowStatus(parentTaskId: string): Promise<WorkflowStatus> {
    const tasks = await this.getWorkflowTasks(parentTaskId);

    const statusCounts = tasks.reduce(
      (acc, task) => {
        acc[task.status]++;
        return acc;
      },
      { pending: 0, in_progress: 0, completed: 0, failed: 0 }
    );

    let overallStatus: WorkflowStatus['overallStatus'] = 'pending';

    if (statusCounts.failed > 0 && statusCounts.completed === 0) {
      overallStatus = 'failed';
    } else if (statusCounts.failed > 0 && statusCounts.completed > 0) {
      overallStatus = 'partial';
    } else if (statusCounts.completed === tasks.length) {
      overallStatus = 'completed';
    } else if (statusCounts.in_progress > 0) {
      overallStatus = 'in_progress';
    }

    return {
      workflowId: parentTaskId,
      totalTasks: tasks.length,
      pendingTasks: statusCounts.pending,
      inProgressTasks: statusCounts.in_progress,
      completedTasks: statusCounts.completed,
      failedTasks: statusCounts.failed,
      overallStatus,
      tasks,
    };
  }

  /**
   * Get currently active workflows (any in-progress tasks).
   */
  async getActiveWorkflows(): Promise<WorkflowStatus[]> {
    // Find all parent tasks with in-progress children
    const inProgressTasks = await prisma.agent_tasks.findMany({
      where: { status: 'in_progress' },
      select: { parentTaskId: true },
    });

    const parentTaskIds = [
      ...new Set(inProgressTasks.map((t) => t.parentTaskId).filter(Boolean) as string[]),
    ];

    return Promise.all(parentTaskIds.map((id) => this.getWorkflowStatus(id)));
  }

  /**
   * Get task by ID.
   */
  async getTask(taskId: string): Promise<AgentTaskResult | null> {
    const task = await prisma.agent_tasks.findUnique({
      where: { id: taskId },
    });

    return task ? this.mapTaskToResult(task) : null;
  }

  /**
   * Get pending tasks for a specific agent type.
   */
  async getPendingTasks(agentType: AgentType, limit: number = 10): Promise<AgentTaskResult[]> {
    const tasks = await prisma.agent_tasks.findMany({
      where: {
        agentType,
        status: 'pending',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return tasks.map(this.mapTaskToResult);
  }

  /**
   * Get agent performance metrics.
   */
  async getAgentMetrics(agentType: AgentType, sinceDays: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const tasks = await prisma.agent_tasks.findMany({
      where: {
        agentType,
        createdAt: { gte: since },
      },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    const completedTasks = tasks.filter(
      (t) => t.status === 'completed' && t.startedAt && t.completedAt
    );

    const avgDuration =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => {
            const duration = t.completedAt!.getTime() - t.startedAt!.getTime();
            return sum + duration;
          }, 0) / completedTasks.length
        : 0;

    return {
      agentType,
      period: `${sinceDays} days`,
      total,
      completed,
      failed,
      pending,
      inProgress,
      successRate: Math.round(successRate * 100) / 100,
      avgDurationMs: Math.round(avgDuration),
      avgDurationSec: Math.round(avgDuration / 1000),
    };
  }

  /**
   * Clean up old completed/failed tasks.
   */
  async cleanupOldTasks(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.agent_tasks.deleteMany({
      where: {
        status: { in: ['completed', 'failed'] },
        completedAt: { lt: cutoffDate },
      },
    });

    logger.info('Cleaned up old agent tasks', {
      deletedCount: result.count,
      olderThanDays,
    });

    return result.count;
  }

  /**
   * Map database task to result type.
   */
  private mapTaskToResult(task: any): AgentTaskResult {
    return {
      id: task.id,
      agentType: task.agentType as AgentType,
      status: task.status as AgentTaskStatus,
      inputData: task.inputData as Record<string, any>,
      outputData: task.outputData as Record<string, any> | undefined,
      errorMessage: task.errorMessage || undefined,
      accountId: task.accountId || undefined,
      contactId: task.contactId || undefined,
      parentTaskId: task.parentTaskId || undefined,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      startedAt: task.startedAt || undefined,
      completedAt: task.completedAt || undefined,
    };
  }
}

// Singleton instance
export const agentStateManager = new AgentStateManager();
