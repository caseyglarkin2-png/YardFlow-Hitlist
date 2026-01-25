import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIDossierGenerator } from '../dossier-generator';
import { GeminiProClient } from '../gemini-client';

// Mock GeminiProClient
vi.mock('../gemini-client');

describe('AIDossierGenerator', () => {
  let generator: AIDossierGenerator;
  let mockGeminiClient: vi.Mocked<GeminiProClient>;

  beforeEach(() => {
    mockGeminiClient = {
      generateJSON: vi.fn(),
    } as any;

    generator = new AIDossierGenerator();
    (generator as any).geminiClient = mockGeminiClient;
  });

  describe('generateDossier', () => {
    test('generates comprehensive dossier with facility intelligence', async () => {
      const mockCompanyData = {
        company_name: 'Waste Solutions Inc',
        industry: 'Waste Management',
        employee_count: 250,
        description: 'Leading waste management provider',
      };

      const mockDossierData = {
        companyOverview: 'Waste Solutions Inc is a leading waste management provider...',
        industryContext: 'Operating in competitive waste management sector...',
        keyPainPoints: ['Route optimization', 'Manual dispatching'],
        techStack: ['Legacy WMS', 'Manual routing'],
        companySize: 'Mid-Market (250 employees)',
        facilityIntelligence: {
          estimatedYardCount: 12,
          confidenceLevel: 'high',
          reasoning: 'Based on employee count and regional presence',
          networkBreakdown: {
            centralHub: 1,
            regionalCenters: 3,
            localYards: 8,
          },
          operationalScale: 'Regional operations across 3 states',
        },
        strategicQuestions: [
          'How do you currently manage route optimization?',
          'What challenges do you face with dispatching?',
        ],
        manifestOpportunities: [
          {
            category: 'Efficiency Gains',
            opportunities: ['Route optimization', 'Real-time visibility'],
            priority: 'high',
          },
        ],
      };

      mockGeminiClient.generateJSON.mockResolvedValue(mockDossierData);

      // Mock database fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account: mockCompanyData }),
      }) as any;

      const result = await generator.generateDossier('account-123');

      expect(result.dossier).toMatchObject({
        companyOverview: expect.any(String),
        facilityIntelligence: {
          estimatedYardCount: expect.any(Number),
          confidenceLevel: expect.stringMatching(/^(high|medium|low)$/),
          reasoning: expect.any(String),
        },
      });

      expect(mockGeminiClient.generateJSON).toHaveBeenCalledWith(
        expect.stringContaining('Waste Solutions Inc'),
        expect.any(Object)
      );
    });

    test('handles companies with no facility data', async () => {
      const mockCompanyData = {
        company_name: 'Software Corp',
        industry: 'Technology',
        employee_count: 50,
      };

      const mockDossierData = {
        companyOverview: 'Software company...',
        industryContext: 'Technology sector...',
        keyPainPoints: ['Scaling challenges'],
        techStack: ['Cloud infrastructure'],
        companySize: 'Small (50 employees)',
        facilityIntelligence: {
          estimatedYardCount: 0,
          confidenceLevel: 'low',
          reasoning: 'Not applicable for software company',
          networkBreakdown: {},
          operationalScale: 'Digital operations',
        },
        strategicQuestions: [],
        manifestOpportunities: [],
      };

      mockGeminiClient.generateJSON.mockResolvedValue(mockDossierData);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account: mockCompanyData }),
      }) as any;

      const result = await generator.generateDossier('account-456');

      expect(result.dossier.facilityIntelligence.estimatedYardCount).toBe(0);
      expect(result.dossier.facilityIntelligence.confidenceLevel).toBe('low');
    });

    test('throws error when Gemini API fails', async () => {
      mockGeminiClient.generateJSON.mockRejectedValue(new Error('Gemini API error'));

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account: { company_name: 'Test' } }),
      }) as any;

      await expect(generator.generateDossier('account-789')).rejects.toThrow('Gemini API error');
    });
  });

  describe('generateBatch', () => {
    test('generates multiple dossiers with rate limiting', async () => {
      const mockDossierData = {
        companyOverview: 'Test company',
        industryContext: 'Test industry',
        keyPainPoints: [],
        techStack: [],
        companySize: 'Small',
        facilityIntelligence: {
          estimatedYardCount: 5,
          confidenceLevel: 'medium',
          reasoning: 'Test reasoning',
          networkBreakdown: {},
          operationalScale: 'Local',
        },
        strategicQuestions: [],
        manifestOpportunities: [],
      };

      mockGeminiClient.generateJSON.mockResolvedValue(mockDossierData);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account: { company_name: 'Test' } }),
      }) as any;

      const accountIds = ['account-1', 'account-2', 'account-3'];
      const results = await generator.generateBatch(accountIds, { dryRun: true, delay: 100 });

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.success)).toHaveLength(3);
    });

    test('continues on individual failures in batch', async () => {
      let callCount = 0;
      mockGeminiClient.generateJSON.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('API error on second call');
        }
        return {
          companyOverview: 'Test',
          industryContext: 'Test',
          keyPainPoints: [],
          techStack: [],
          companySize: 'Small',
          facilityIntelligence: {
            estimatedYardCount: 5,
            confidenceLevel: 'medium',
            reasoning: 'Test',
            networkBreakdown: {},
            operationalScale: 'Local',
          },
          strategicQuestions: [],
          manifestOpportunities: [],
        };
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ account: { company_name: 'Test' } }),
      }) as any;

      const accountIds = ['account-1', 'account-2', 'account-3'];
      const results = await generator.generateBatch(accountIds, { dryRun: true, delay: 50 });

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.success)).toHaveLength(2);
      expect(results.filter((r) => !r.success)).toHaveLength(1);
      expect(results[1].error).toContain('API error');
    });
  });
});
