import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentStateManager } from '../state-manager';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    agent_tasks: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AgentStateManager', () => {
  let manager: AgentStateManager;

  beforeEach(() => {
    manager = new AgentStateManager();
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a new agent task', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockTask = {
        id: 'task_123',
        agentType: 'research',
        status: 'pending',
        inputData: { accountId: 'acc_1' },
        outputData: null,
        errorMessage: null,
        accountId: 'acc_1',
        contactId: null,
        parentTaskId: null,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
      };

      (prisma.agent_tasks.create as any).mockResolvedValue(mockTask);

      const result = await manager.createTask({
        agentType: 'research',
        inputData: { accountId: 'acc_1' },
        accountId: 'acc_1',
      });

      expect(result.id).toBe('task_123');
      expect(result.agentType).toBe('research');
      expect(result.status).toBe('pending');
      expect(prisma.agent_tasks.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          agentType: 'research',
          status: 'pending',
          maxRetries: 3,
        }),
      });
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task to in_progress and set startedAt', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockTask = {
        id: 'task_123',
        agentType: 'research',
        status: 'in_progress',
        inputData: {},
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
      };

      (prisma.agent_tasks.update as any).mockResolvedValue(mockTask);

      const result = await manager.updateTaskStatus('task_123', 'in_progress');

      expect(result.status).toBe('in_progress');
      expect(prisma.agent_tasks.update).toHaveBeenCalledWith({
        where: { id: 'task_123' },
        data: expect.objectContaining({
          status: 'in_progress',
          startedAt: expect.any(Date),
        }),
      });
    });

    it('should update task to completed and set completedAt', async () => {
      const { prisma } = await import('@/lib/db');
      
      const mockTask = {
        id: 'task_123',
        agentType: 'research',
        status: 'completed',
        inputData: {},
        outputData: { result: 'success' },
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      (prisma.agent_tasks.update as any).mockResolvedValue(mockTask);

      const result = await manager.updateTaskStatus(
        'task_123',
        'completed',
        { result: 'success' }
      );

      expect(result.status).toBe('completed');
      expect(result.outputData).toEqual({ result: 'success' });
    });
  });

  describe('failTask', () => {
    it('should retry task if under max retries', async () => {
      const { prisma } = await import('@/lib/db');
      
      const existingTask = {
        id: 'task_123',
        retryCount: 1,
        maxRetries: 3,
      };

      const updatedTask = {
        id: 'task_123',
        agentType: 'research',
        status: 'pending',
        inputData: {},
        errorMessage: 'API timeout',
        retryCount: 2,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.agent_tasks.findUnique as any).mockResolvedValue(existingTask);
      (prisma.agent_tasks.update as any).mockResolvedValue(updatedTask);

      const result = await manager.failTask('task_123', 'API timeout');

      expect(result.shouldRetry).toBe(true);
      expect(result.task.status).toBe('pending');
      expect(result.task.retryCount).toBe(2);
    });

    it('should mark as failed if max retries exceeded', async () => {
      const { prisma } = await import('@/lib/db');
      
      const existingTask = {
        id: 'task_123',
        retryCount: 2,
        maxRetries: 3,
      };

      const updatedTask = {
        id: 'task_123',
        agentType: 'research',
        status: 'failed',
        inputData: {},
        errorMessage: 'API timeout',
        retryCount: 3,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      (prisma.agent_tasks.findUnique as any).mockResolvedValue(existingTask);
      (prisma.agent_tasks.update as any).mockResolvedValue(updatedTask);

      const result = await manager.failTask('task_123', 'API timeout');

      expect(result.shouldRetry).toBe(false);
      expect(result.task.status).toBe('failed');
    });
  });

  describe('getAgentMetrics', () => {
    it('should calculate success rate and average duration', async () => {
      const { prisma } = await import('@/lib/db');
      
      const now = new Date();
      const mockTasks = [
        {
          agentType: 'research',
          status: 'completed',
          createdAt: now,
          startedAt: new Date(now.getTime() - 5000),
          completedAt: now,
        },
        {
          agentType: 'research',
          status: 'completed',
          createdAt: now,
          startedAt: new Date(now.getTime() - 3000),
          completedAt: now,
        },
        {
          agentType: 'research',
          status: 'failed',
          createdAt: now,
        },
      ];

      (prisma.agent_tasks.findMany as any).mockResolvedValue(mockTasks);

      const metrics = await manager.getAgentMetrics('research', 7);

      expect(metrics.total).toBe(3);
      expect(metrics.completed).toBe(2);
      expect(metrics.failed).toBe(1);
      expect(metrics.successRate).toBeCloseTo(66.67, 1);
      expect(metrics.avgDurationMs).toBeGreaterThan(0);
    });
  });
});
