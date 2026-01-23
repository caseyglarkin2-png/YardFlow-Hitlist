/**
 * Tests for LinkedIn Extractor
 */

import { LinkedInExtractor } from '../linkedin-extractor';
import { GoogleSearchClient } from '../google-search-client';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    people: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    linkedin_profiles: {
      upsert: jest.fn(),
    },
    target_accounts: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../google-search-client');

describe('LinkedInExtractor', () => {
  let extractor: LinkedInExtractor;
  let mockSearchClient: jest.Mocked<GoogleSearchClient>;

  beforeEach(() => {
    extractor = new LinkedInExtractor();
    mockSearchClient = (extractor as any).searchClient;
    jest.clearAllMocks();
  });

  describe('discoverProfile', () => {
    it('should return error when person not found', async () => {
      (prisma.people.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await extractor.discoverProfile('person-1');

      expect(result.profileUrl).toBeNull();
      expect(result.error).toBe('Person not found');
      expect(result.confidence).toBe(0);
    });

    it('should discover LinkedIn profile', async () => {
      (prisma.people.findUnique as jest.Mock).mockResolvedValue({
        id: 'person-1',
        name: 'John Doe',
        accountId: 'account-1',
        target_accounts: { id: 'account-1', name: 'Acme Corp' },
      });

      mockSearchClient.searchLinkedIn.mockResolvedValue('https://www.linkedin.com/in/johndoe');

      const result = await extractor.discoverProfile('person-1');

      expect(result.profileUrl).toBe('https://www.linkedin.com/in/johndoe');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.foundVia).toBe('google_search');
    });

    it('should calculate high confidence for exact name match', async () => {
      (prisma.people.findUnique as jest.Mock).mockResolvedValue({
        id: 'person-1',
        name: 'John Doe',
        accountId: 'account-1',
        target_accounts: { id: 'account-1', name: 'Acme Corp' },
      });

      mockSearchClient.searchLinkedIn.mockResolvedValue('https://www.linkedin.com/in/johndoe');

      const result = await extractor.discoverProfile('person-1');

      // URL contains both 'john' and 'doe'
      expect(result.confidence).toBeGreaterThanOrEqual(90);
    });

    it('should calculate lower confidence for partial name match', async () => {
      (prisma.people.findUnique as jest.Mock).mockResolvedValue({
        id: 'person-1',
        name: 'John Doe',
        accountId: 'account-1',
        target_accounts: { id: 'account-1', name: 'Acme Corp' },
      });

      mockSearchClient.searchLinkedIn.mockResolvedValue('https://www.linkedin.com/in/jdoe123');

      const result = await extractor.discoverProfile('person-1');

      // URL only contains 'doe'
      expect(result.confidence).toBeLessThan(90);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should handle search failures gracefully', async () => {
      (prisma.people.findUnique as jest.Mock).mockResolvedValue({
        id: 'person-1',
        name: 'John Doe',
        accountId: 'account-1',
        target_accounts: { id: 'account-1', name: 'Acme Corp' },
      });

      mockSearchClient.searchLinkedIn.mockResolvedValue(null);

      const result = await extractor.discoverProfile('person-1');

      expect(result.profileUrl).toBeNull();
      expect(result.error).toBe('Profile not found');
    });
  });

  describe('saveProfile', () => {
    it('should save profile to database', async () => {
      (prisma.linkedin_profiles.upsert as jest.Mock).mockResolvedValue({});
      (prisma.people.update as jest.Mock).mockResolvedValue({});

      await extractor.saveProfile('person-1', 'https://linkedin.com/in/johndoe', 85);

      expect(prisma.linkedin_profiles.upsert).toHaveBeenCalledWith({
        where: { personId: 'person-1' },
        create: {
          personId: 'person-1',
          profileUrl: 'https://linkedin.com/in/johndoe',
          confidence: 85,
          foundVia: 'google_search',
        },
        update: expect.objectContaining({
          profileUrl: 'https://linkedin.com/in/johndoe',
          confidence: 85,
        }),
      });

      expect(prisma.people.update).toHaveBeenCalledWith({
        where: { id: 'person-1' },
        data: { linkedin: 'https://linkedin.com/in/johndoe' },
      });
    });
  });

  describe('enrichCompanyContacts', () => {
    it('should enrich all people at a company', async () => {
      (prisma.people.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'person-1',
          name: 'John Doe',
          accountId: 'account-1',
          target_accounts: { id: 'account-1', name: 'Acme Corp' },
        },
        {
          id: 'person-2',
          name: 'Jane Smith',
          accountId: 'account-1',
          target_accounts: { id: 'account-1', name: 'Acme Corp' },
        },
      ]);

      mockSearchClient.searchLinkedIn
        .mockResolvedValueOnce('https://linkedin.com/in/johndoe')
        .mockResolvedValueOnce('https://linkedin.com/in/janesmith');

      (prisma.linkedin_profiles.upsert as jest.Mock).mockResolvedValue({});
      (prisma.people.update as jest.Mock).mockResolvedValue({});

      const result = await extractor.enrichCompanyContacts('account-1', {
        dryRun: false,
        limit: 10,
      });

      expect(result.total).toBe(2);
      expect(result.found).toBe(2);
      expect(result.notFound).toBe(0);
    });

    it('should respect dryRun mode', async () => {
      (prisma.people.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'person-1',
          name: 'John Doe',
          accountId: 'account-1',
          target_accounts: { id: 'account-1', name: 'Acme Corp' },
        },
      ]);

      mockSearchClient.searchLinkedIn.mockResolvedValue('https://linkedin.com/in/johndoe');

      const result = await extractor.enrichCompanyContacts('account-1', {
        dryRun: true,
      });

      expect(result.found).toBe(1);
      expect(prisma.linkedin_profiles.upsert).not.toHaveBeenCalled();
    });
  });
});
