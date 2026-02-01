/**
 * Sequence Engineer Agent Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing agent
vi.mock('@/lib/db', () => ({
  prisma: {
    sequences: {
      create: vi.fn().mockResolvedValue({ id: 'seq-123' }),
      findUnique: vi.fn(),
    },
    people: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'person-1',
        isExecOps: true,
        target_accounts: { icpScore: 80 },
        contact_insights: [],
      }),
    },
    activities: {
      count: vi.fn().mockResolvedValue(2),
    },
    agent_tasks: {
      create: vi.fn().mockResolvedValue({ id: 'task-123' }),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/agents/state-manager', () => ({
  agentStateManager: {
    createTask: vi.fn().mockResolvedValue({ id: 'task-123' }),
    updateTaskStatus: vi.fn(),
    failTask: vi.fn(),
  },
}));

vi.mock('@/lib/yardflow-content-hub', () => ({
  contentHubClient: {
    getBrandMessaging: vi.fn().mockResolvedValue({ headlines: [], ctas: [] }),
  },
}));

import {
  SequenceEngineerAgent,
  type SequenceBlueprint,
} from '@/lib/agents/sequence-engineer-agent';
import { prisma } from '@/lib/db';

describe('SequenceEngineerAgent', () => {
  let agent: SequenceEngineerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new SequenceEngineerAgent();
  });

  describe('createSequenceFromBlueprint', () => {
    it('should create sequence in database from blueprint', async () => {
      const blueprint: SequenceBlueprint = {
        name: 'Test Sequence',
        description: 'Test description',
        targetPersona: 'ExecOps',
        minIcpScore: 70,
        steps: [
          {
            stepNumber: 1,
            delayHours: 0,
            channel: 'EMAIL',
            templateType: 'intro',
            personalizationLevel: 'high',
          },
          {
            stepNumber: 2,
            delayHours: 48,
            channel: 'LINKEDIN',
            templateType: 'follow-up',
            personalizationLevel: 'medium',
          },
        ],
      };

      const sequenceId = await agent.createSequenceFromBlueprint(blueprint, 'campaign-1');

      expect(sequenceId).toMatch(/^seq-/);
      expect(prisma.sequences.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Sequence',
          description: 'Test description',
          campaignId: 'campaign-1',
          isActive: true,
        }),
      });
    });

    it('should store steps as JSON in sequence', async () => {
      const blueprint: SequenceBlueprint = {
        name: 'Multi-step',
        description: 'Multi-step sequence',
        targetPersona: 'Ops',
        minIcpScore: 60,
        steps: [
          {
            stepNumber: 1,
            delayHours: 0,
            channel: 'EMAIL',
            templateType: 'intro',
            personalizationLevel: 'high',
          },
        ],
      };

      await agent.createSequenceFromBlueprint(blueprint);

      expect(prisma.sequences.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          steps: expect.stringContaining('stepNumber'),
        }),
      });
    });

    it('should allow null campaignId', async () => {
      const blueprint: SequenceBlueprint = {
        name: 'Standalone',
        description: 'No campaign',
        targetPersona: 'Procurement',
        minIcpScore: 50,
        steps: [],
      };

      await agent.createSequenceFromBlueprint(blueprint);

      expect(prisma.sequences.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaignId: null,
        }),
      });
    });
  });

  describe('designSequence', () => {
    it.todo('should design multi-step outreach sequence');
    it.todo('should include multiple channels (email, LinkedIn)');
  });
});
