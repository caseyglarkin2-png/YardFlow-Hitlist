/**
 * Research Agent Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResearchAgent, CompanyDossier, ResearchInput } from '@/lib/agents/research-agent';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    target_accounts: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'mock-account-id',
        name: 'Test Company',
        website: 'https://testcompany.com',
        industry: 'logistics',
        people: [],
        company_dossiers: null,
      }),
    },
    company_dossiers: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({ id: 'mock-dossier-id' }),
    },
    activities: {
      count: vi.fn().mockResolvedValue(5),
    },
  },
}));

vi.mock('@/lib/agents/state-manager', () => ({
  agentStateManager: {
    createTask: vi.fn().mockResolvedValue({ id: 'mock-task-id' }),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/ai-research', () => ({
  generateCompanyResearch: vi.fn().mockResolvedValue({
    companyOverview: 'Test Company is a leading logistics provider.',
    recentNews: 'Recently expanded operations.',
    industryContext: 'Operating in the competitive logistics space.',
    keyPainPoints: 'Manual processes, visibility gaps.',
    techStack: 'Legacy TMS, spreadsheets for planning.',
    companySize: '500-1000 employees',
    facilityCount: '10 warehouses',
    locations: 'US, Canada, Mexico',
  }),
}));

vi.mock('@/lib/ai/gemini-client', () => ({
  GeminiProClient: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue('Mock AI response'),
  })),
}));

vi.mock('@/lib/yardflow-content-hub', () => ({
  contentHubClient: {
    getCaseStudies: vi.fn().mockResolvedValue([
      { title: 'Case Study 1', challenge: 'Improved efficiency' },
    ]),
  },
}));

vi.mock('@/lib/redis-cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

describe('ResearchAgent', () => {
  let agent: ResearchAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ResearchAgent();
  });

  describe('generateDossier', () => {
    it('should research company and create dossier', async () => {
      const input: ResearchInput = {
        accountId: 'mock-account-id',
        sources: ['gemini', 'database'],
      };

      const dossier = await agent.generateDossier(input);

      expect(dossier).toBeDefined();
      expect(dossier.companyOverview).toBeTruthy();
      expect(dossier.companySize).toBeTruthy();
    });

    it('should extract key pain points', async () => {
      const input: ResearchInput = {
        accountId: 'mock-account-id',
      };

      const dossier = await agent.generateDossier(input);

      expect(dossier.keyPainPoints).toBeTruthy();
      expect(dossier.keyPainPoints.length).toBeGreaterThan(0);
    });

    it('should identify tech stack', async () => {
      const input: ResearchInput = {
        accountId: 'mock-account-id',
        deepDive: true,
      };

      const dossier = await agent.generateDossier(input);

      expect(dossier.techStack).toBeDefined();
    });

    it('should find recent news', async () => {
      const input: ResearchInput = {
        accountId: 'mock-account-id',
      };

      const dossier = await agent.generateDossier(input);

      expect(dossier.recentNews).toBeDefined();
      expect(dossier.recentNews.length).toBeGreaterThan(0);
    });
  });

  describe('data compilation', () => {
    it('should compile research into structured dossier', async () => {
      const input: ResearchInput = {
        accountId: 'mock-account-id',
        sources: ['gemini', 'content-hub', 'database'],
      };

      const dossier = await agent.generateDossier(input);

      // Check all required fields exist
      const requiredFields: (keyof CompanyDossier)[] = [
        'companyOverview',
        'recentNews',
        'industryContext',
        'keyPainPoints',
        'companySize',
      ];

      requiredFields.forEach(field => {
        expect(dossier[field]).toBeDefined();
      });
    });

    it('should handle missing data gracefully', async () => {
      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.target_accounts.findUnique).mockResolvedValueOnce({
        id: 'sparse-account',
        name: 'Sparse Company',
        website: null,
        industry: null,
        people: [],
        company_dossiers: null,
        eventId: 'test-event',
        icpScore: 0,
        assignedTo: null,
        status: null,
        priority: null,
        notes: null,
        interestedProducts: [],
        painPoints: [],
        booth: null,
        domain: null,
        exhibitorCategory: null,
        linkedinCompanyUrl: null,
        updatedAt: new Date(),
      });

      const input: ResearchInput = {
        accountId: 'sparse-account',
      };

      // Should not throw
      const dossier = await agent.generateDossier(input);
      expect(dossier).toBeDefined();
      expect(dossier.companyOverview).toBeDefined();
    });
  });
});
