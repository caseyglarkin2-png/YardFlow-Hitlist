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
    it('should design multi-step outreach sequence', async () => {
      const blueprint: SequenceBlueprint = {
        name: 'Multi-Step Campaign',
        description: 'Full multi-step outreach',
        targetPersona: 'ExecOps',
        minIcpScore: 75,
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
            delayHours: 24,
            channel: 'LINKEDIN',
            templateType: 'connect',
            personalizationLevel: 'medium',
          },
          {
            stepNumber: 3,
            delayHours: 72,
            channel: 'EMAIL',
            templateType: 'follow-up',
            personalizationLevel: 'medium',
          },
          {
            stepNumber: 4,
            delayHours: 120,
            channel: 'EMAIL',
            templateType: 'value-prop',
            personalizationLevel: 'high',
          },
        ],
      };

      const sequenceId = await agent.createSequenceFromBlueprint(blueprint);

      expect(sequenceId).toBeDefined();
      expect(prisma.sequences.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Multi-Step Campaign',
          steps: expect.stringContaining('stepNumber'),
        }),
      });

      // Verify steps were serialized with all 4 steps
      const createCall = vi.mocked(prisma.sequences.create).mock.calls[0][0];
      const steps = JSON.parse(createCall.data.steps as string);
      expect(steps).toHaveLength(4);
    });

    it('should include multiple channels (email, LinkedIn)', async () => {
      const blueprint: SequenceBlueprint = {
        name: 'Multi-Channel Campaign',
        description: 'Email and LinkedIn',
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

      await agent.createSequenceFromBlueprint(blueprint);

      const createCall = vi.mocked(prisma.sequences.create).mock.calls[0][0];
      const steps = JSON.parse(createCall.data.steps as string);
      
      const channels = steps.map((s: { channel: string }) => s.channel);
      expect(channels).toContain('EMAIL');
      expect(channels).toContain('LINKEDIN');
    });
  });
});
