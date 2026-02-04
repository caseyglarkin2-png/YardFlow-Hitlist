/**
 * Dossier Transformer Tests
 *
 * Tests for transforming Railway dossier format to frontend-compatible format.
 */

import { describe, it, expect } from 'vitest';
import {
  transformDossierToFrontendFormat,
  transformToFrontendResponse,
} from '@/lib/ai/dossier-transformer';
import type { DossierGenerationResult } from '@/lib/ai/dossier-generator';

describe('transformDossierToFrontendFormat', () => {
  const mockAccount = {
    website: 'https://example.com',
    headquarters: 'Dallas, TX',
  };

  describe('new frontend format', () => {
    it('transforms complete dossier correctly', () => {
      const rawDossier = {
        description: 'A leading logistics company',
        industryCategory: 'Logistics & Distribution',
        facilityCount: '12 facilities',
        distributionFootprint: 'National',
        revenueEstimate: '$100M-500M',
        isYardIntensive: true,
        yardPainPoints: ['Dock congestion', 'Trailer tracking'],
        talkingPoints: ['Recent expansion', 'New technology adoption'],
        competitors: ['Competitor A', 'Competitor B'],
        decisionMakers: ['VP Operations', 'Director of Logistics'],
      };

      const result = transformDossierToFrontendFormat(rawDossier, mockAccount);

      expect(result.description).toBe('A leading logistics company');
      expect(result.industryCategory).toBe('Logistics & Distribution');
      expect(result.facilityCount).toBe('12 facilities');
      expect(result.distributionFootprint).toBe('National');
      expect(result.revenueEstimate).toBe('$100M-500M');
      expect(result.isYardIntensive).toBe(true);
      expect(result.yardPainPoints).toEqual(['Dock congestion', 'Trailer tracking']);
      expect(result.talkingPoints).toEqual(['Recent expansion', 'New technology adoption']);
      expect(result.competitors).toEqual(['Competitor A', 'Competitor B']);
      expect(result.decisionMakers).toEqual(['VP Operations', 'Director of Logistics']);
      expect(result.website).toBe('https://example.com');
      expect(result.headquarters).toBe('Dallas, TX');
    });

    it('handles missing optional fields', () => {
      const rawDossier = {
        description: 'Basic company info',
      };

      const result = transformDossierToFrontendFormat(rawDossier, { website: null });

      expect(result.description).toBe('Basic company info');
      expect(result.website).toBe('');
      expect(result.headquarters).toBe('Unknown');
      expect(result.facilityCount).toBe('Unknown');
      expect(result.isYardIntensive).toBe(false);
      expect(result.yardPainPoints).toEqual([]);
      expect(result.decisionMakers).toEqual([]);
    });

    it('uses account data for website and headquarters', () => {
      const rawDossier = { description: 'Test' };
      const account = {
        website: 'https://acme.com',
        headquarters: 'New York, NY',
      };

      const result = transformDossierToFrontendFormat(rawDossier, account);

      expect(result.website).toBe('https://acme.com');
      expect(result.headquarters).toBe('New York, NY');
    });
  });

  describe('legacy format (backwards compatibility)', () => {
    it('transforms legacy dossier format', () => {
      const legacyDossier = {
        companyOverview: 'Legacy company overview',
        industryContext: 'This is a logistics and distribution company',
        keyPainPoints: ['Old pain point 1', 'Old pain point 2'],
        companySize: 'Enterprise (500+ employees)',
        facilityIntelligence: {
          estimatedYardCount: 15,
          confidenceLevel: 'high',
          operationalScale: 'Regional - Southwest',
        },
        talkingPoints: ['Legacy talking point'],
        competitors: ['Legacy Competitor'],
      };

      const result = transformDossierToFrontendFormat(legacyDossier, mockAccount);

      expect(result.description).toBe('Legacy company overview');
      expect(result.facilityCount).toBe('15 facilities');
      expect(result.industryCategory).toBe('Logistics');
      expect(result.distributionFootprint).toBe('Regional - Southwest');
      expect(result.revenueEstimate).toBe('Enterprise (500+ employees)');
      expect(result.yardPainPoints).toEqual(['Old pain point 1', 'Old pain point 2']);
      expect(result.talkingPoints).toEqual(['Legacy talking point']);
      expect(result.competitors).toEqual(['Legacy Competitor']);
      expect(result.decisionMakers).toEqual([]); // Not in legacy
    });

    it('infers yard-intensive from legacy content', () => {
      const yardIntensiveDossier = {
        companyOverview: 'Company operates distribution centers with yard operations',
      };

      const notYardIntensiveDossier = {
        companyOverview: 'Software consulting company',
      };

      const yardResult = transformDossierToFrontendFormat(yardIntensiveDossier, mockAccount);
      const notYardResult = transformDossierToFrontendFormat(notYardIntensiveDossier, mockAccount);

      expect(yardResult.isYardIntensive).toBe(true);
      expect(notYardResult.isYardIntensive).toBe(false);
    });
  });

  describe('array handling', () => {
    it('filters out non-string array elements', () => {
      const rawDossier = {
        description: 'Test',
        yardPainPoints: ['Valid', 123, null, 'Also Valid', undefined],
        competitors: [null, 'Comp A'],
      };

      const result = transformDossierToFrontendFormat(
        rawDossier as Record<string, unknown>,
        mockAccount
      );

      expect(result.yardPainPoints).toEqual(['Valid', 'Also Valid']);
      expect(result.competitors).toEqual(['Comp A']);
    });

    it('handles non-array values gracefully', () => {
      const rawDossier = {
        description: 'Test',
        yardPainPoints: 'not an array',
        competitors: { invalid: true },
      };

      const result = transformDossierToFrontendFormat(
        rawDossier as Record<string, unknown>,
        mockAccount
      );

      expect(result.yardPainPoints).toEqual([]);
      expect(result.competitors).toEqual([]);
    });
  });
});

describe('transformToFrontendResponse', () => {
  const mockAccount = {
    website: 'https://example.com',
    headquarters: 'Dallas, TX',
  };

  it('transforms successful result', () => {
    const result: DossierGenerationResult = {
      accountId: 'acc-123',
      companyName: 'Acme Corp',
      success: true,
      dossier: {
        companyOverview: 'Acme overview',
        talkingPoints: ['Point 1'],
        competitors: ['Comp A'],
      },
    };

    const response = transformToFrontendResponse(result, mockAccount);

    expect(response.success).toBe(true);
    expect(response.data).not.toBeNull();
    expect(response.data?.description).toBe('Acme overview');
    expect(response.researchedAt).toBeDefined();
    expect(response.confidence?.overall).toBe('medium');
  });

  it('handles failed result', () => {
    const result: DossierGenerationResult = {
      accountId: 'acc-123',
      companyName: 'Acme Corp',
      success: false,
      error: 'API rate limited',
    };

    const response = transformToFrontendResponse(result, mockAccount);

    expect(response.success).toBe(false);
    expect(response.data).toBeNull();
    expect(response.error).toBe('API rate limited');
  });

  it('maps confidence levels correctly', () => {
    const makeResult = (confidenceLevel: string): DossierGenerationResult => ({
      accountId: 'acc-123',
      companyName: 'Test',
      success: true,
      dossier: {
        companyOverview: 'Test',
        confidenceLevel,
      } as DossierGenerationResult['dossier'],
    });

    expect(transformToFrontendResponse(makeResult('high'), mockAccount).confidence?.overall).toBe(
      'high'
    );
    expect(transformToFrontendResponse(makeResult('medium'), mockAccount).confidence?.overall).toBe(
      'medium'
    );
    expect(transformToFrontendResponse(makeResult('low'), mockAccount).confidence?.overall).toBe(
      'low'
    );
    expect(transformToFrontendResponse(makeResult('HIGH'), mockAccount).confidence?.overall).toBe(
      'high'
    );
    expect(
      transformToFrontendResponse(makeResult('unknown'), mockAccount).confidence?.overall
    ).toBe('medium');
  });

  it('includes sources from new format', () => {
    const result: DossierGenerationResult = {
      accountId: 'acc-123',
      companyName: 'Test',
      success: true,
      dossier: {
        companyOverview: 'Test',
        sources: ['Web Research', 'Industry Analysis'],
      } as DossierGenerationResult['dossier'],
    };

    const response = transformToFrontendResponse(result, mockAccount);

    expect(response.sources).toEqual(['Web Research', 'Industry Analysis']);
  });

  it('provides default sources when missing', () => {
    const result: DossierGenerationResult = {
      accountId: 'acc-123',
      companyName: 'Test',
      success: true,
      dossier: {
        companyOverview: 'Test',
      },
    };

    const response = transformToFrontendResponse(result, mockAccount);

    expect(response.sources).toEqual(['AI Research', 'Company Profile Analysis']);
  });
});
