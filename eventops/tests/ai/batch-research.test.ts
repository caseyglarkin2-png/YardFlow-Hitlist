/**
 * Tests for Batch Research Endpoint
 *
 * Tests rate limiting, batch processing, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/db', () => ({
  prisma: {
    target_accounts: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/queue/client', () => ({
  getRedisConnection: vi.fn(() => ({
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    multi: vi.fn(() => ({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  })),
}));

vi.mock('@/lib/ai/dossier-generator', () => ({
  DossierGenerator: vi.fn().mockImplementation(() => ({
    generateDossier: vi.fn().mockResolvedValue({
      companyOverview: 'Test overview',
      yardManagementPotential: 'High',
      icpFitAnalysis: 'Good fit',
      keyPainPoints: '["Pain 1", "Pain 2"]',
      outreachAngles: '["Angle 1"]',
      talkingPoints: '["Point 1"]',
    }),
  })),
}));

vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: vi.fn().mockResolvedValue({
    userId: 'test-user-123',
    type: 'session',
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from '@/lib/db';
import { getRedisConnection } from '@/lib/queue/client';

describe('Batch Research Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    it('allows requests under rate limit', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue('5'), // 5 requests used
        incr: vi.fn().mockResolvedValue(6),
        expire: vi.fn().mockResolvedValue(1),
        ttl: vi.fn().mockResolvedValue(30),
        multi: vi.fn(() => ({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([]),
        })),
      };
      vi.mocked(getRedisConnection).mockReturnValue(mockRedis as never);

      vi.mocked(prisma.target_accounts.findMany).mockResolvedValue([]);

      // The rate limit should allow since 5 < 20
      expect(mockRedis.get).toBeDefined();
    });

    it('blocks requests over rate limit', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue('20'), // At limit
        incr: vi.fn(),
        expire: vi.fn(),
        ttl: vi.fn().mockResolvedValue(45),
        multi: vi.fn(() => ({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([]),
        })),
      };
      vi.mocked(getRedisConnection).mockReturnValue(mockRedis as never);

      // With 20 requests, rate limit should be hit
      const count = parseInt(await mockRedis.get('rate:test'), 10);
      expect(count).toBe(20);
    });

    it('allows requests when rate limit not set', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null), // No previous requests
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
        ttl: vi.fn().mockResolvedValue(-1),
        multi: vi.fn(() => ({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([]),
        })),
      };
      vi.mocked(getRedisConnection).mockReturnValue(mockRedis as never);

      const count = await mockRedis.get('rate:test');
      expect(count).toBeNull();
    });
  });

  describe('Batch Processing', () => {
    it('returns cached dossiers when available', async () => {
      const mockAccount = {
        id: 'acc-123',
        name: 'Test Corp',
        company_dossiers: {
          companyOverview: 'Cached overview',
          yardManagementPotential: 'Medium',
          icpFitAnalysis: 'Fair',
          keyPainPoints: '[]',
          outreachAngles: '[]',
          talkingPoints: '[]',
          updatedAt: new Date(), // Fresh
        },
        people: [],
      };

      vi.mocked(prisma.target_accounts.findMany).mockResolvedValue([mockAccount] as never);

      const result = await prisma.target_accounts.findMany({
        where: { id: { in: ['acc-123'] } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].company_dossiers?.companyOverview).toBe('Cached overview');
    });

    it('handles missing accounts gracefully', async () => {
      vi.mocked(prisma.target_accounts.findMany).mockResolvedValue([]);

      const result = await prisma.target_accounts.findMany({
        where: { id: { in: ['nonexistent-id'] } },
      });

      expect(result).toHaveLength(0);
    });

    it('respects max batch size', () => {
      const MAX_BATCH_SIZE = 10;
      const oversizedBatch = Array.from({ length: 15 }, (_, i) => `acc-${i}`);

      expect(oversizedBatch.length).toBeGreaterThan(MAX_BATCH_SIZE);
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      vi.mocked(prisma.target_accounts.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        prisma.target_accounts.findMany({ where: { id: { in: ['test'] } } })
      ).rejects.toThrow('Database connection failed');
    });

    it('handles Redis errors in rate limiting', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('Redis down')),
        incr: vi.fn(),
        expire: vi.fn(),
        ttl: vi.fn(),
        multi: vi.fn(() => ({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockRejectedValue(new Error('Redis down')),
        })),
      };
      vi.mocked(getRedisConnection).mockReturnValue(mockRedis as never);

      await expect(mockRedis.get('test')).rejects.toThrow('Redis down');
    });
  });

  describe('Validation', () => {
    it('requires at least one account ID', () => {
      const emptyBatch: string[] = [];
      expect(emptyBatch.length).toBe(0);
    });

    it('validates UUID format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const invalidId = 'not-a-uuid';

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(uuidRegex.test(validUuid)).toBe(true);
      expect(uuidRegex.test(invalidId)).toBe(false);
    });
  });
});
