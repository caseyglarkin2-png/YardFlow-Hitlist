/**
 * Agent Orchestrator Tests
 *
 * Tests for the full campaign workflow orchestrator.
 * These tests verify Steps 1-5 of runFullCampaign work correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing orchestrator
vi.mock('@/lib/db', () => ({
  prisma: {
    agent_tasks: {
      create: vi.fn().mockResolvedValue({ id: 'task-123', status: 'pending' }),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'task-123', status: 'in_progress' }),
    },
    people: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: 'person-1', name: 'John Doe', title: 'VP Ops', email: 'john@test.com' },
        ]),
    },
    sequences: {
      create: vi.fn().mockResolvedValue({ id: 'seq-123' }),
    },
    message_templates: {
      create: vi.fn().mockResolvedValue({ id: 'template-123' }),
    },
  },
}));

// Mock logger to avoid console spam
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock state manager
vi.mock('@/lib/agents/state-manager', () => ({
  agentStateManager: {
    createTask: vi.fn().mockResolvedValue({ id: 'root-task-123' }),
    updateTaskStatus: vi.fn().mockResolvedValue(true),
    getActiveWorkflows: vi.fn().mockResolvedValue([]),
    getAgentMetrics: vi.fn().mockResolvedValue({}),
    getTaskHistory: vi.fn().mockResolvedValue([]),
    getPendingTasks: vi.fn().mockResolvedValue([]),
  },
}));

import { AgentOrchestrator, getAgentOrchestrator } from '@/lib/agents/orchestrator';
import { prisma } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockAgentTask = any; // Test mock - Prisma types are complex

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new AgentOrchestrator();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance from getAgentOrchestrator', () => {
      const instance1 = getAgentOrchestrator();
      const instance2 = getAgentOrchestrator();
      expect(instance1).toBe(instance2);
    });
  });

  describe('runFullCampaign', () => {
    it('should create a root task for the workflow', async () => {
      const { agentStateManager } = await import('@/lib/agents/state-manager');

      await orchestrator.runFullCampaign({
        eventId: 'event-123',
        targetAccounts: ['account-1'],
        campaignType: 'pre-event',
      });

      expect(agentStateManager.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: expect.any(String),
          inputData: expect.objectContaining({
            eventId: 'event-123',
          }),
        })
      );
    });

    it('should return workflow with tasks array', async () => {
      const result = await orchestrator.runFullCampaign({
        eventId: 'event-123',
        targetAccounts: ['account-1'],
        campaignType: 'booth-outreach',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('status');
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it('should set status to completed on success', async () => {
      const result = await orchestrator.runFullCampaign({
        eventId: 'event-123',
        targetAccounts: ['account-1'],
        campaignType: 'post-event',
      });

      expect(result.status).toBe('completed');
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return not found for invalid workflow id', async () => {
      vi.mocked(prisma.agent_tasks.findUnique).mockResolvedValue(null);

      const status = await orchestrator.getWorkflowStatus('invalid-id');

      expect(status.found).toBe(false);
    });

    it('should return workflow status with progress', async () => {
      vi.mocked(prisma.agent_tasks.findUnique).mockResolvedValue({
        id: 'workflow-123',
        status: 'completed',
        agentType: 'sequence',
        inputData: {},
        outputData: null,
        errorMessage: null,
        accountId: null,
        contactId: null,
        parentTaskId: null,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        childTasks: [
          {
            id: 'task-1',
            agentType: 'research',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            errorMessage: null,
          },
          {
            id: 'task-2',
            agentType: 'sequence',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            errorMessage: null,
          },
        ],
      } as any);

      const status = await orchestrator.getWorkflowStatus('workflow-123');

      expect(status.found).toBe(true);
      expect(status.progress).toBe(100);
      expect(status.steps).toHaveLength(2);
    });

    it('should calculate progress percentage correctly', async () => {
      vi.mocked(prisma.agent_tasks.findUnique).mockResolvedValue({
        id: 'workflow-123',
        status: 'in_progress',
        agentType: 'sequence',
        inputData: {},
        outputData: null,
        errorMessage: null,
        accountId: null,
        contactId: null,
        parentTaskId: null,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
        childTasks: [
          {
            id: 'task-1',
            agentType: 'research',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            errorMessage: null,
          },
          {
            id: 'task-2',
            agentType: 'sequence',
            status: 'pending',
            startedAt: null,
            completedAt: null,
            errorMessage: null,
          },
          {
            id: 'task-3',
            agentType: 'content',
            status: 'pending',
            startedAt: null,
            completedAt: null,
            errorMessage: null,
          },
          {
            id: 'task-4',
            agentType: 'socials',
            status: 'pending',
            startedAt: null,
            completedAt: null,
            errorMessage: null,
          },
        ],
      } as MockAgentTask);

      const status = await orchestrator.getWorkflowStatus('workflow-123');

      expect(status.found).toBe(true);
      expect(status.progress).toBe(25); // 1 of 4 completed = 25%
    });
  });

  describe('retryFailedStep', () => {
    it('should return null for non-existent task', async () => {
      vi.mocked(prisma.agent_tasks.findUnique).mockResolvedValue(null);

      const result = await orchestrator.retryFailedStep('workflow-123', 'invalid-task');

      expect(result).toBeNull();
    });

    it('should return null when task is not in failed state', async () => {
      vi.mocked(prisma.agent_tasks.findUnique).mockResolvedValue({
        id: 'task-123',
        status: 'completed',
        retryCount: 0,
        maxRetries: 3,
      } as MockAgentTask);

      const result = await orchestrator.retryFailedStep('workflow-123', 'task-123');

      expect(result).toBeNull();
    });

    it('should return null when max retries exceeded', async () => {
      vi.mocked(prisma.agent_tasks.findUnique).mockResolvedValue({
        id: 'task-123',
        status: 'failed',
        retryCount: 3,
        maxRetries: 3,
      } as MockAgentTask);

      const result = await orchestrator.retryFailedStep('workflow-123', 'task-123');

      expect(result).toBeNull();
    });
  });
});
