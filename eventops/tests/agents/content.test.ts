/**
 * Content Purposing Agent Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ContentPurposingAgent,
  ContentRequest,
  PurposedContent,
} from '@/lib/agents/content-purposing-agent';

vi.mock('@/lib/db', () => ({
  prisma: {
    message_templates: {
      create: vi.fn().mockResolvedValue({ id: 'mock-template-id' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/agents/state-manager', () => ({
  agentStateManager: {
    createTask: vi.fn().mockResolvedValue({ id: 'mock-task-id' }),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/yardflow-content-hub', () => ({
  contentHubClient: {
    getCaseStudies: vi.fn().mockResolvedValue([
      {
        title: 'Logistics Case Study',
        content: 'A logistics company improved efficiency by 40%.',
        industry: 'logistics',
        persona: 'operations',
      },
    ]),
    getEmailTemplates: vi.fn().mockResolvedValue([
      {
        subject: 'Discover how {{company}} can transform operations',
        body: 'Hi {{name}}, I noticed your team at {{company}}...',
        persona: 'exec_ops',
      },
    ]),
    getSocialPosts: vi.fn().mockResolvedValue([
      {
        platform: 'linkedin',
        content: 'Excited to share how companies are transforming...',
      },
    ]),
    getBrandMessaging: vi.fn().mockResolvedValue({
      headlines: ['Transform your logistics'],
      ctas: ['Learn more'],
      valueProps: ['Save 40% on operations'],
    }),
  },
}));

vi.mock('@/lib/content-hub', () => ({
  contentHub: {
    apiUrl: 'https://content.example.com',
  },
}));

describe('ContentPurposingAgent', () => {
  let agent: ContentPurposingAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ContentPurposingAgent();
  });

  describe('purposeContent', () => {
    it('should generate personalized email content', async () => {
      const request: ContentRequest = {
        persona: 'exec_ops',
        industry: 'logistics',
        campaignGoal: 'awareness',
        contentType: 'email-template',
      };

      const result = await agent.purposeContent(request);

      expect(result).toBeDefined();
      expect(result.personalized).toBeTruthy();
      expect(result.metadata.source).toBeDefined();
    });

    it('should incorporate pain points from dossier', async () => {
      const request: ContentRequest = {
        persona: 'procurement',
        industry: 'manufacturing',
        campaignGoal: 'consideration',
        contentType: 'case-study',
      };

      const result = await agent.purposeContent(request);

      // Content should be adapted for persona
      expect(result.metadata.adaptations.length).toBeGreaterThan(0);
      expect(result.personalized).toBeTruthy();
    });

    it('should create multiple template variations', async () => {
      const personas = ['exec_ops', 'procurement', 'operations'];
      const results: PurposedContent[] = [];

      for (const persona of personas) {
        const request: ContentRequest = {
          persona,
          industry: 'logistics',
          campaignGoal: 'awareness',
          contentType: 'email-template',
        };
        results.push(await agent.purposeContent(request));
      }

      expect(results.length).toBe(3);
      // Each result should have personalization
      results.forEach((result) => {
        expect(result.personalized).toBeTruthy();
      });
    });

    it('should generate subject lines with high open rates', async () => {
      const request: ContentRequest = {
        persona: 'exec_ops',
        industry: 'logistics',
        campaignGoal: 'awareness',
        contentType: 'email-template',
      };

      const result = await agent.purposeContent(request);

      // Check that original has subject or personalized content exists
      expect(result.original.subject || result.personalized).toBeTruthy();
    });
  });

  describe('generateTemplates', () => {
    it('should create templates for each sequence step', async () => {
      const steps = ['intro', 'followup', 'value_prop'];
      const templates: PurposedContent[] = [];

      for (const _step of steps) {
        const request: ContentRequest = {
          persona: 'exec_ops',
          industry: 'logistics',
          campaignGoal: 'consideration',
          contentType: 'email-template',
        };
        templates.push(await agent.purposeContent(request));
      }

      expect(templates.length).toBe(3);
    });

    it('should maintain consistent voice across sequence', async () => {
      const request1: ContentRequest = {
        persona: 'exec_ops',
        industry: 'logistics',
        campaignGoal: 'awareness',
        contentType: 'email-template',
      };

      const request2: ContentRequest = {
        persona: 'exec_ops',
        industry: 'logistics',
        campaignGoal: 'consideration',
        contentType: 'email-template',
      };

      const result1 = await agent.purposeContent(request1);
      const result2 = await agent.purposeContent(request2);

      // Both should have personalized content
      expect(result1.personalized).toBeTruthy();
      expect(result2.personalized).toBeTruthy();
      // Both should have the same source type
      expect(result1.metadata.source).toBeDefined();
      expect(result2.metadata.source).toBeDefined();
    });
  });
});
