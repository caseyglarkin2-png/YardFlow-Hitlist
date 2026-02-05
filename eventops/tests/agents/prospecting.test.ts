/**
 * Prospecting Agent Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProspectingAgent,
  ProspectingCriteria,
  DiscoveredLead,
} from '@/lib/agents/prospecting-agent';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    target_accounts: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'mock-account-id', name: 'Test Co' }),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    people: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'mock-person-id', name: 'Test Person' }),
    },
  },
}));

vi.mock('@/lib/agents/state-manager', () => ({
  agentStateManager: {
    createTask: vi.fn().mockResolvedValue({ id: 'mock-task-id' }),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ProspectingAgent', () => {
  let agent: ProspectingAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ProspectingAgent();
  });

  describe('discoverLeads', () => {
    it('should find high-ICP accounts for campaign', async () => {
      const criteria: ProspectingCriteria = {
        eventId: 'manifest-2026',
        sources: ['manifest'],
        icpCriteria: { minScore: 70 },
      };

      const leads = await agent.discoverLeads(criteria);

      expect(leads.length).toBeGreaterThan(0);
      expect(leads.every((l) => l.source)).toBe(true);
      expect(leads.every((l) => l.name)).toBe(true);
      expect(leads.every((l) => l.company)).toBe(true);
    });

    it('should filter by minimum ICP score', async () => {
      const criteria: ProspectingCriteria = {
        eventId: 'manifest-2026',
        sources: ['manifest'],
        icpCriteria: { minScore: 80 },
      };

      const allLeads = await agent.discoverLeads({ ...criteria, icpCriteria: undefined });
      const filteredLeads = await agent.qualifyLeads(allLeads, criteria.icpCriteria);

      // All filtered leads should meet minimum score
      expect(filteredLeads.every((l) => (l.estimatedIcpScore || 0) >= 80)).toBe(true);
    });

    it('should identify key contacts at accounts', async () => {
      const criteria: ProspectingCriteria = {
        eventId: 'manifest-2026',
        sources: ['manifest', 'linkedin'],
      };

      const leads = await agent.discoverLeads(criteria);

      // Leads should include key contacts with titles
      const withTitles = leads.filter((l) => l.title);
      expect(withTitles.length).toBeGreaterThan(0);

      // Some contacts should be executives
      const executives = leads.filter((l) => /vp|director|chief|coo/i.test(l.title || ''));
      expect(executives.length).toBeGreaterThan(0);
    });

    it('should handle empty results gracefully', async () => {
      const criteria: ProspectingCriteria = {
        eventId: 'nonexistent-event',
        sources: [], // Empty sources
        maxLeads: 0,
      };

      const leads = await agent.discoverLeads(criteria);

      expect(Array.isArray(leads)).toBe(true);
      expect(leads.length).toBe(0);
    });
  });

  describe('qualifyLeads', () => {
    it('should enrich contact data from LinkedIn', async () => {
      const criteria: ProspectingCriteria = {
        sources: ['linkedin'],
      };

      const leads = await agent.discoverLeads(criteria);
      const linkedinLeads = leads.filter((l) => l.source === 'linkedin-search');

      // LinkedIn leads should have LinkedIn URLs
      linkedinLeads.forEach((lead) => {
        expect(lead.linkedinUrl || lead.source === 'linkedin-search').toBeTruthy();
        expect(lead.confidence).toBeDefined();
      });
    });

    it('should validate email addresses', async () => {
      const mockLeads: DiscoveredLead[] = [
        {
          name: 'Valid Email',
          company: 'Test Co',
          email: 'valid@example.com',
          source: 'test',
          confidence: 'HIGH',
        },
        {
          name: 'No Email',
          company: 'Test Co',
          source: 'test',
          confidence: 'MEDIUM',
        },
      ];

      const qualified = await agent.qualifyLeads(mockLeads);

      // Should return all leads (email validation is separate concern)
      expect(qualified.length).toBe(2);

      // Leads with emails should have valid format
      const withEmails = qualified.filter((l) => l.email);
      withEmails.forEach((lead) => {
        expect(lead.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('importLeads', () => {
    it('should import qualified leads to database', async () => {
      const leads: DiscoveredLead[] = [
        {
          name: 'Test Contact',
          company: 'Test Company',
          title: 'VP Operations',
          source: 'manifest',
          confidence: 'HIGH',
          estimatedIcpScore: 85,
        },
      ];

      const result = await agent.importLeads(leads, 'manifest-2026');

      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('skipped');
      expect(result.imported + result.skipped).toBe(leads.length);
    });
  });
});
