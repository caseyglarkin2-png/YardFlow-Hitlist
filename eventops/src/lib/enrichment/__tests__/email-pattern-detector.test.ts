/**
 * Tests for Email Pattern Detector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailPatternDetector } from '../email-pattern-detector';
import { prisma } from '@/lib/db';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    people: {
      findMany: vi.fn(),
    },
    email_patterns: {
      upsert: vi.fn(),
    },
  },
}));

describe('EmailPatternDetector', () => {
  let detector: EmailPatternDetector;

  beforeEach(() => {
    detector = new EmailPatternDetector();
    vi.clearAllMocks();
  });

  describe('detectPatternsForCompany', () => {
    it('should return empty result when no emails found', async () => {
      (prisma.people.findMany as vi.Mock).mockResolvedValue([]);

      const result = await detector.detectPatternsForCompany('account-1');

      expect(result.totalEmails).toBe(0);
      expect(result.detectedPatterns).toEqual([]);
      expect(result.primaryPattern).toBeNull();
      expect(result.recommendation).toContain('No emails found');
    });

    it('should detect first.last pattern', async () => {
      const mockContacts = [
        {
          id: '1',
          accountId: 'account-1',
          name: 'John Doe',
          email: 'john.doe@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
        {
          id: '2',
          accountId: 'account-1',
          name: 'Jane Smith',
          email: 'jane.smith@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
      ];

      (prisma.people.findMany as vi.Mock).mockResolvedValue(mockContacts);

      const result = await detector.detectPatternsForCompany('account-1');

      expect(result.totalEmails).toBe(2);
      expect(result.domain).toBe('acme.com');
      expect(result.primaryPattern?.patternType).toBe('first.last');
      expect(result.primaryPattern?.confidence).toBe(100);
      expect(result.recommendation).toContain('Strong pattern');
    });

    it('should detect flast pattern', async () => {
      const mockContacts = [
        {
          id: '1',
          accountId: 'account-1',
          name: 'John Doe',
          email: 'jdoe@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
        {
          id: '2',
          accountId: 'account-1',
          name: 'Jane Smith',
          email: 'jsmith@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
      ];

      (prisma.people.findMany as vi.Mock).mockResolvedValue(mockContacts);

      const result = await detector.detectPatternsForCompany('account-1');

      expect(result.primaryPattern?.patternType).toBe('flast');
      expect(result.primaryPattern?.confidence).toBe(100);
    });

    it('should handle special characters in names', async () => {
      const mockContacts = [
        {
          id: '1',
          accountId: 'account-1',
          name: "Patrick O'Brien",
          email: 'patrick.obrien@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
        {
          id: '2',
          accountId: 'account-1',
          name: 'José García',
          email: 'jose.garcia@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
      ];

      (prisma.people.findMany as vi.Mock).mockResolvedValue(mockContacts);

      const result = await detector.detectPatternsForCompany('account-1');

      expect(result.primaryPattern?.patternType).toBe('first.last');
      expect(result.totalEmails).toBe(2);
    });

    it('should detect multiple patterns and rank by confidence', async () => {
      const mockContacts = [
        {
          id: '1',
          accountId: 'account-1',
          name: 'John Doe',
          email: 'john.doe@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
        {
          id: '2',
          accountId: 'account-1',
          name: 'Jane Smith',
          email: 'jane.smith@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
        {
          id: '3',
          accountId: 'account-1',
          name: 'Bob Wilson',
          email: 'bwilson@acme.com',
          target_accounts: { id: 'account-1', name: 'Acme Corp', website: 'acme.com' },
          createdAt: new Date(),
        },
      ];

      (prisma.people.findMany as vi.Mock).mockResolvedValue(mockContacts);

      const result = await detector.detectPatternsForCompany('account-1');

      expect(result.detectedPatterns.length).toBeGreaterThan(1);
      expect(result.primaryPattern?.patternType).toBe('first.last'); // 66% confidence
      expect(result.primaryPattern?.confidence).toBeGreaterThan(60);
    });

    it('should provide moderate recommendation for 50-80% confidence', async () => {
      const mockContacts = [
        { id: '1', accountId: 'account-1', name: 'John Doe', email: 'john.doe@acme.com', target_accounts: {}, createdAt: new Date() },
        { id: '2', accountId: 'account-1', name: 'Jane Smith', email: 'jsmith@acme.com', target_accounts: {}, createdAt: new Date() },
      ];

      (prisma.people.findMany as vi.Mock).mockResolvedValue(mockContacts);

      const result = await detector.detectPatternsForCompany('account-1');

      expect(result.recommendation).toContain('Moderate pattern');
    });
  });

  describe('generateEmail', () => {
    it('should generate first.last format', () => {
      const email = detector.generateEmail('John', 'Doe', 'acme.com', 'first.last');
      expect(email).toBe('john.doe@acme.com');
    });

    it('should generate flast format', () => {
      const email = detector.generateEmail('John', 'Doe', 'acme.com', 'flast');
      expect(email).toBe('jdoe@acme.com');
    });

    it('should generate f.last format', () => {
      const email = detector.generateEmail('John', 'Doe', 'acme.com', 'f.last');
      expect(email).toBe('j.doe@acme.com');
    });

    it('should generate firstlast format', () => {
      const email = detector.generateEmail('John', 'Doe', 'acme.com', 'firstlast');
      expect(email).toBe('johndoe@acme.com');
    });

    it('should generate first_last format', () => {
      const email = detector.generateEmail('John', 'Doe', 'acme.com', 'first_last');
      expect(email).toBe('john_doe@acme.com');
    });

    it('should normalize special characters', () => {
      const email = detector.generateEmail('José', 'García', 'acme.com', 'first.last');
      expect(email).toBe('jose.garcia@acme.com');
    });

    it('should handle apostrophes in names', () => {
      const email = detector.generateEmail('Patrick', "O'Brien", 'acme.com', 'first.last');
      expect(email).toBe('patrick.obrien@acme.com');
    });
  });

  describe('savePatternsToDatabase', () => {
    it('should save patterns to database', async () => {
      const patterns = [
        {
          companyId: 'account-1',
          companyDomain: 'acme.com',
          patternType: 'first.last' as const,
          confidence: 100,
          sampleSize: 5,
          examples: ['john.doe@acme.com', 'jane.smith@acme.com'],
        },
      ];

      (prisma.email_patterns.upsert as vi.Mock).mockResolvedValue({});

      await detector.savePatternsToDatabase('account-1', patterns);

      expect(prisma.email_patterns.upsert).toHaveBeenCalledWith({
        where: {
          accountId_patternType: {
            accountId: 'account-1',
            patternType: 'first.last',
          },
        },
        create: expect.objectContaining({
          accountId: 'account-1',
          companyDomain: 'acme.com',
          patternType: 'first.last',
          confidence: 100,
          sampleSize: 5,
        }),
        update: expect.objectContaining({
          confidence: 100,
          sampleSize: 5,
        }),
      });
    });
  });
});
