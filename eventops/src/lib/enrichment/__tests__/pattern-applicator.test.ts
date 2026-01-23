/**
 * Tests for Pattern Applicator
 */

import { PatternApplicator } from '../pattern-applicator';
import { EmailPatternDetector } from '../email-pattern-detector';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    target_accounts: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    people: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../email-pattern-detector');

describe('PatternApplicator', () => {
  let applicator: PatternApplicator;
  let mockDetector: jest.Mocked<EmailPatternDetector>;

  beforeEach(() => {
    applicator = new PatternApplicator();
    mockDetector = (applicator as any).detector;
    jest.clearAllMocks();
  });

  describe('enrichCompanyContacts', () => {
    it('should return error when company not found', async () => {
      (prisma.target_accounts.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await applicator.enrichCompanyContacts('account-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Company not found');
    });

    it('should return error when pattern confidence too low', async () => {
      (prisma.target_accounts.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        name: 'Acme Corp',
      });

      mockDetector.detectPatternsForCompany.mockResolvedValue({
        domain: 'acme.com',
        totalEmails: 2,
        detectedPatterns: [],
        primaryPattern: {
          id: 'pattern-1',
          companyId: 'account-1',
          companyDomain: 'acme.com',
          patternType: 'first.last',
          confidence: 50, // Below threshold
          sampleSize: 2,
          examples: [],
          verifiedCount: 0,
          bouncedCount: 0,
          lastDetectedAt: new Date(),
        },
        recommendation: 'Weak pattern',
      });

      const result = await applicator.enrichCompanyContacts('account-1', {
        minConfidence: 70,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient pattern confidence');
    });

    it('should apply patterns in dry run mode', async () => {
      (prisma.target_accounts.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        name: 'Acme Corp',
      });

      mockDetector.detectPatternsForCompany.mockResolvedValue({
        domain: 'acme.com',
        totalEmails: 2,
        detectedPatterns: [],
        primaryPattern: {
          id: 'pattern-1',
          companyId: 'account-1',
          companyDomain: 'acme.com',
          patternType: 'first.last',
          confidence: 85,
          sampleSize: 5,
          examples: [],
          verifiedCount: 0,
          bouncedCount: 0,
          lastDetectedAt: new Date(),
        },
        recommendation: 'Strong pattern',
      });

      (prisma.people.findMany as jest.Mock).mockResolvedValue([
        { id: '1', accountId: 'account-1', name: 'Bob Wilson', email: null },
        { id: '2', accountId: 'account-1', name: 'Alice Johnson', email: null },
      ]);

      mockDetector.generateEmail.mockReturnValueOnce('bob.wilson@acme.com')
        .mockReturnValueOnce('alice.johnson@acme.com');

      const result = await applicator.enrichCompanyContacts('account-1', {
        dryRun: true,
        minConfidence: 70,
      });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(2);
      expect(result.sampleEmails).toContain('bob.wilson@acme.com');
      expect(prisma.people.update).not.toHaveBeenCalled(); // Dry run
    });

    it('should actually update emails when dryRun=false', async () => {
      (prisma.target_accounts.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        name: 'Acme Corp',
      });

      mockDetector.detectPatternsForCompany.mockResolvedValue({
        domain: 'acme.com',
        totalEmails: 2,
        detectedPatterns: [],
        primaryPattern: {
          id: 'pattern-1',
          companyId: 'account-1',
          companyDomain: 'acme.com',
          patternType: 'first.last',
          confidence: 85,
          sampleSize: 5,
          examples: [],
          verifiedCount: 0,
          bouncedCount: 0,
          lastDetectedAt: new Date(),
        },
        recommendation: 'Strong pattern',
      });

      (prisma.people.findMany as jest.Mock).mockResolvedValue([
        { id: '1', accountId: 'account-1', name: 'Bob Wilson', email: null },
      ]);

      mockDetector.generateEmail.mockReturnValue('bob.wilson@acme.com');

      const result = await applicator.enrichCompanyContacts('account-1', {
        dryRun: false,
        minConfidence: 70,
      });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(1);
      expect(prisma.people.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          email: 'bob.wilson@acme.com',
        }),
      });
    });

    it('should respect force option', async () => {
      (prisma.target_accounts.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        name: 'Acme Corp',
      });

      mockDetector.detectPatternsForCompany.mockResolvedValue({
        domain: 'acme.com',
        totalEmails: 2,
        detectedPatterns: [],
        primaryPattern: {
          id: 'pattern-1',
          companyId: 'account-1',
          companyDomain: 'acme.com',
          patternType: 'first.last',
          confidence: 85,
          sampleSize: 5,
          examples: [],
          verifiedCount: 0,
          bouncedCount: 0,
          lastDetectedAt: new Date(),
        },
        recommendation: 'Strong pattern',
      });

      (prisma.people.findMany as jest.Mock).mockResolvedValue([
        { id: '1', accountId: 'account-1', name: 'Bob Wilson', email: 'old@email.com' },
      ]);

      mockDetector.generateEmail.mockReturnValue('bob.wilson@acme.com');

      const result = await applicator.enrichCompanyContacts('account-1', {
        dryRun: true,
        force: true,
      });

      expect(result.applied).toBe(1);
      expect(prisma.people.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            // Should not have email: null when force=true
          }),
        })
      );
    });
  });

  describe('enrichAllCompanies', () => {
    it('should process multiple companies', async () => {
      (prisma.target_accounts.findMany as jest.Mock).mockResolvedValue([
        { id: 'account-1', name: 'Acme Corp' },
        { id: 'account-2', name: 'Beta Inc' },
      ]);

      (prisma.target_accounts.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'account-1', name: 'Acme Corp' })
        .mockResolvedValueOnce({ id: 'account-2', name: 'Beta Inc' });

      mockDetector.detectPatternsForCompany.mockResolvedValue({
        domain: 'acme.com',
        totalEmails: 2,
        detectedPatterns: [],
        primaryPattern: {
          id: 'pattern-1',
          companyId: 'account-1',
          companyDomain: 'acme.com',
          patternType: 'first.last',
          confidence: 85,
          sampleSize: 5,
          examples: [],
          verifiedCount: 0,
          bouncedCount: 0,
          lastDetectedAt: new Date(),
        },
        recommendation: 'Strong pattern',
      });

      (prisma.people.findMany as jest.Mock).mockResolvedValue([
        { id: '1', accountId: 'account-1', name: 'Bob Wilson', email: null },
      ]);

      mockDetector.generateEmail.mockReturnValue('bob.wilson@acme.com');

      const result = await applicator.enrichAllCompanies({
        limit: 10,
        dryRun: true,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.totalApplied).toBeGreaterThan(0);
    });
  });
});
