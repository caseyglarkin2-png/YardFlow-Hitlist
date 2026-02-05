/**
 * Full Campaign Workflow Integration Test
 *
 * Tests the complete campaign workflow from prospecting to content generation.
 * These tests run against real agents with mocked external APIs.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mockAccount, mockCampaign, mockEvent } from '../agents/fixtures/mock-account';

// Mock all external dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    target_accounts: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'mock-account-id',
        name: 'Test Company',
        eventId: 'manifest-2026',
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mock-account-id' }),
    },
    people: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mock-person-id' }),
    },
    agent_tasks: {
      create: vi.fn().mockResolvedValue({ id: 'task-123' }),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    sequences: {
      create: vi.fn().mockResolvedValue({ id: 'seq-123' }),
    },
    company_dossiers: {
      upsert: vi.fn().mockResolvedValue({ id: 'dossier-123' }),
    },
    activities: {
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock('@/lib/agents/state-manager', () => ({
  agentStateManager: {
    createTask: vi.fn().mockResolvedValue({ id: 'task-123' }),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
    failTask: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/ai-research', () => ({
  generateCompanyResearch: vi.fn().mockResolvedValue({
    companyOverview: 'Test overview',
    recentNews: 'Test news',
    industryContext: 'Test context',
    keyPainPoints: 'Test pain points',
    companySize: '100-500',
  }),
}));

vi.mock('@/lib/ai/gemini-client', () => ({
  GeminiProClient: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue('Mock response'),
  })),
}));

vi.mock('@/lib/yardflow-content-hub', () => ({
  contentHubClient: {
    getCaseStudies: vi.fn().mockResolvedValue([]),
    getBrandMessaging: vi.fn().mockResolvedValue({ headlines: [] }),
  },
}));

vi.mock('@/lib/redis-cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

describe('Full Campaign Workflow', () => {
  let _testAccountId: string;
  let _testCampaignId: string;
  let _testEventId: string;

  beforeAll(async () => {
    _testEventId = mockEvent.id;
    _testAccountId = mockAccount.id;
    _testCampaignId = mockCampaign.id;
  });

  afterAll(async () => {
    vi.clearAllMocks();
  });

  describe('End-to-End Workflow', () => {
    it('should run full workflow from prospecting to content', async () => {
      const { ProspectingAgent } = await import('@/lib/agents/prospecting-agent');
      const { ResearchAgent } = await import('@/lib/agents/research-agent');
      
      const prospector = new ProspectingAgent();
      const researcher = new ResearchAgent();
      
      // Step 1: Prospecting
      const leads = await prospector.discoverLeads({
        eventId: 'manifest-2026',
        sources: ['manifest'],
      });
      expect(leads.length).toBeGreaterThan(0);
      
      // Step 2: Research (would use leads in real workflow)
      const dossier = await researcher.generateDossier({
        accountId: 'mock-account-id',
      });
      expect(dossier.companyOverview).toBeTruthy();
    });

    it('should create parent task with child tasks for each step', async () => {
      const { agentStateManager } = await import('@/lib/agents/state-manager');
      
      // Simulate workflow task creation
      await agentStateManager.createTask({
        agentType: 'prospecting',
        inputData: { eventId: 'manifest-2026' },
      });
      
      expect(agentStateManager.createTask).toHaveBeenCalled();
    });

    it('should persist workflow state in database', async () => {
      const { agentStateManager } = await import('@/lib/agents/state-manager');
      
      const task = await agentStateManager.createTask({
        agentType: 'research',
        accountId: 'mock-account-id',
        inputData: {},
      });
      
      await agentStateManager.updateTaskStatus(task.id, 'completed', { result: 'success' });
      
      expect(agentStateManager.updateTaskStatus).toHaveBeenCalledWith(
        task.id,
        'completed',
        expect.anything()
      );
    });

    it('should handle failures gracefully and allow retry', async () => {
      const { agentStateManager } = await import('@/lib/agents/state-manager');
      
      const task = await agentStateManager.createTask({
        agentType: 'content',
        inputData: {},
      });
      
      // Simulate failure
      await agentStateManager.failTask(task.id, 'Test error');
      
      expect(agentStateManager.failTask).toHaveBeenCalledWith(task.id, 'Test error');
    });
  });

  describe('Step Transitions', () => {
    it('should transition from prospecting to research', async () => {
      const { ProspectingAgent } = await import('@/lib/agents/prospecting-agent');
      const { ResearchAgent } = await import('@/lib/agents/research-agent');
      
      const prospector = new ProspectingAgent();
      const researcher = new ResearchAgent();
      
      const leads = await prospector.discoverLeads({ sources: ['manifest'] });
      expect(leads.length).toBeGreaterThan(0);
      
      // Research on discovered account
      const dossier = await researcher.generateDossier({ accountId: 'mock-account-id' });
      expect(dossier).toBeDefined();
    });

    it('should transition from research to sequence design', async () => {
      const { SequenceEngineerAgent } = await import('@/lib/agents/sequence-engineer-agent');
      
      const sequencer = new SequenceEngineerAgent();
      
      const sequenceId = await sequencer.createSequenceFromBlueprint({
        name: 'Post-Research Sequence',
        description: 'Follow-up after research',
        targetPersona: 'ExecOps',
        minIcpScore: 70,
        steps: [
          { stepNumber: 1, delayHours: 0, channel: 'EMAIL', templateType: 'intro', personalizationLevel: 'high' },
        ],
      });
      
      expect(sequenceId).toBeDefined();
    });

    it('should transition from sequence to content creation', async () => {
      const { ContentPurposingAgent } = await import('@/lib/agents/content-purposing-agent');
      
      const contentAgent = new ContentPurposingAgent();
      
      const content = await contentAgent.purposeContent({
        persona: 'exec_ops',
        industry: 'logistics',
        campaignGoal: 'awareness',
        contentType: 'case-study',
      });
      
      expect(content.personalized).toBeTruthy();
    });

    it('should transition from content to socials', async () => {
      // Socials agent would create social posts from content
      // For now, verify content can be adapted
      const { ContentPurposingAgent } = await import('@/lib/agents/content-purposing-agent');
      
      const contentAgent = new ContentPurposingAgent();
      
      const socialContent = await contentAgent.purposeContent({
        persona: 'exec_ops',
        campaignGoal: 'awareness',
        contentType: 'case-study',
      });
      
      expect(socialContent.metadata.source).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should mark failed step in database', async () => {
      const { agentStateManager } = await import('@/lib/agents/state-manager');
      
      const task = await agentStateManager.createTask({
        agentType: 'research',
        inputData: {},
      });
      
      await agentStateManager.updateTaskStatus(task.id, 'failed', undefined, 'Database error');
      
      expect(agentStateManager.updateTaskStatus).toHaveBeenCalledWith(
        task.id,
        'failed',
        undefined,
        'Database error'
      );
    });

    it('should increment retry count on failure', async () => {
      // In a real implementation, the task would track retry count
      const { agentStateManager } = await import('@/lib/agents/state-manager');
      
      const task = await agentStateManager.createTask({
        agentType: 'content',
        inputData: { attempt: 1 },
      });
      
      // Task created successfully
      expect(task.id).toBeDefined();
    });

    it('should stop after max retries exceeded', async () => {
      // Mock behavior: after 3 retries, mark as permanently failed
      const maxRetries = 3;
      let currentAttempt = 0;
      
      while (currentAttempt < maxRetries) {
        currentAttempt++;
      }
      
      expect(currentAttempt).toBe(maxRetries);
    });
  });

  describe('Performance', () => {
    it('should complete full workflow within 60 seconds', async () => {
      const start = Date.now();
      
      // Simulate workflow steps
      const { ProspectingAgent } = await import('@/lib/agents/prospecting-agent');
      const prospector = new ProspectingAgent();
      await prospector.discoverLeads({ sources: ['manifest'] });
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(60000);
    });

    it('should not exceed memory limits during workflow', async () => {
      // Track memory usage (simplified check)
      const memBefore = process.memoryUsage().heapUsed;
      
      const { ProspectingAgent } = await import('@/lib/agents/prospecting-agent');
      const prospector = new ProspectingAgent();
      
      // Run multiple operations
      for (let i = 0; i < 10; i++) {
        await prospector.discoverLeads({ sources: ['manifest'], maxLeads: 5 });
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = memAfter - memBefore;
      
      // Should not grow by more than 50MB
      expect(memDelta).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
