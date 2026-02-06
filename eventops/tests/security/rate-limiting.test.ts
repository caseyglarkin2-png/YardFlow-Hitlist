/**
 * Rate Limiting Tests — Sprint 54
 *
 * Validates the shared Redis rate limiter and verifies rate limiting
 * is applied to all AI and public endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(__dirname, '../../src');

// ─── Shared Rate Limiter Unit Tests ─────────────────────────────────────

describe('Shared Rate Limiter (src/lib/rate-limiter.ts)', () => {
  // Reset modules between tests to get fresh mocks
  beforeEach(() => {
    vi.resetModules();
  });

  it('allows requests under the limit', async () => {
    let callCount = 0;
    vi.doMock('@/lib/queue/client', () => ({
      getRedisConnection: () => ({
        multi: () => ({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([
            [null, ++callCount],
            [null, 1],
          ]),
        }),
        ttl: vi.fn().mockResolvedValue(55),
      }),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const result = await checkRateLimit('test:key', 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeDefined();
  });

  it('blocks requests over the limit', async () => {
    vi.doMock('@/lib/queue/client', () => ({
      getRedisConnection: () => ({
        multi: () => ({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([
            [null, 11],
            [null, 1],
          ]),
        }),
        ttl: vi.fn().mockResolvedValue(45),
      }),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const result = await checkRateLimit('test:key', 10, 60);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(45);
    expect(result.remaining).toBe(0);
  });

  it('fails open when Redis is unavailable', async () => {
    vi.doMock('@/lib/queue/client', () => ({
      getRedisConnection: () => {
        throw new Error('Redis connection refused');
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const result = await checkRateLimit('test:key', 10, 60);
    expect(result.allowed).toBe(true);
  });

  it('fails open when MULTI/EXEC returns pipeline error', async () => {
    vi.doMock('@/lib/queue/client', () => ({
      getRedisConnection: () => ({
        multi: () => ({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([
            [new Error('EXECABORT'), null],
            [null, 1],
          ]),
        }),
        ttl: vi.fn().mockResolvedValue(60),
      }),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { checkRateLimit } = await import('@/lib/rate-limiter');
    const result = await checkRateLimit('test:key', 10, 60);
    expect(result.allowed).toBe(true);
  });

  it('uses atomic MULTI/EXEC (not separate INCR + EXPIRE)', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'lib/rate-limiter.ts'), 'utf-8');
    expect(content).toContain('redis.multi()');
    expect(content).toContain('multi.incr(');
    expect(content).toContain('multi.expire(');
    expect(content).toContain('multi.exec()');
    // Should NOT have separate incr/expire calls
    expect(content).not.toContain('redis.incr(');
  });
});

// ─── Rate Limiter Key Builder ───────────────────────────────────────────

describe('rateLimitKey', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('joins parts with colons', async () => {
    vi.doMock('@/lib/queue/client', () => ({
      getRedisConnection: vi.fn(),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { rateLimitKey } = await import('@/lib/rate-limiter');
    expect(rateLimitKey('ai', 'chat', 'user123')).toBe('ai:chat:user123');
    expect(rateLimitKey('webhook', 'sendgrid', '1.2.3.4')).toBe('webhook:sendgrid:1.2.3.4');
  });
});

// ─── AI Endpoint Rate Limiting Coverage ─────────────────────────────────

describe('AI Endpoint Rate Limiting', () => {
  const AI_ROUTES_WITH_LIMITS = [
    {
      path: 'app/api/ai/chat/route.ts',
      name: '/api/ai/chat',
      expectedLimit: 20,
    },
    {
      path: 'app/api/ai/content/generate/route.ts',
      name: '/api/ai/content/generate',
      expectedLimit: 30,
    },
    {
      path: 'app/api/ai/dossier/generate/route.ts',
      name: '/api/ai/dossier/generate',
      expectedLimit: 10,
    },
    {
      path: 'app/api/ai/content/sequence/route.ts',
      name: '/api/ai/content/sequence',
      expectedLimit: 5,
    },
  ];

  AI_ROUTES_WITH_LIMITS.forEach(({ path: routePath, name, expectedLimit }) => {
    it(`${name} imports shared rate limiter`, () => {
      const content = fs.readFileSync(path.join(SRC_DIR, routePath), 'utf-8');
      expect(content).toContain("from '@/lib/rate-limiter'");
    });

    it(`${name} calls checkRateLimit with limit ${expectedLimit}`, () => {
      const content = fs.readFileSync(path.join(SRC_DIR, routePath), 'utf-8');
      expect(content).toContain('checkRateLimit');
      expect(content).toContain(String(expectedLimit));
    });

    it(`${name} returns 429 when rate limited`, () => {
      const content = fs.readFileSync(path.join(SRC_DIR, routePath), 'utf-8');
      expect(content).toContain('429');
      expect(content).toContain('Retry-After');
    });
  });
});

// ─── Public Endpoint Rate Limiting Coverage ─────────────────────────────

describe('Public Endpoint Rate Limiting', () => {
  const PUBLIC_ROUTES = [
    {
      path: 'app/api/unsubscribe/route.ts',
      name: '/api/unsubscribe',
      expectedLimit: 10,
    },
    {
      path: 'app/api/outreach/track/route.ts',
      name: '/api/outreach/track',
      expectedLimit: 100,
    },
    {
      path: 'app/api/webhooks/sendgrid/route.ts',
      name: '/api/webhooks/sendgrid',
      expectedLimit: 500,
    },
  ];

  PUBLIC_ROUTES.forEach(({ path: routePath, name, expectedLimit }) => {
    it(`${name} imports shared rate limiter`, () => {
      const content = fs.readFileSync(path.join(SRC_DIR, routePath), 'utf-8');
      expect(content).toContain("from '@/lib/rate-limiter'");
    });

    it(`${name} rate limits by IP (x-forwarded-for)`, () => {
      const content = fs.readFileSync(path.join(SRC_DIR, routePath), 'utf-8');
      expect(content).toContain('x-forwarded-for');
    });

    it(`${name} uses limit of ${expectedLimit} req/min`, () => {
      const content = fs.readFileSync(path.join(SRC_DIR, routePath), 'utf-8');
      expect(content).toContain(String(expectedLimit));
    });
  });

  it('/api/outreach/track still returns pixel even when rate limited', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'app/api/outreach/track/route.ts'), 'utf-8');
    // Should return the pixel on rate limit (not a JSON 429)
    // to avoid breaking email client rendering
    const rateBlockMatch = content.match(/rateCheck\.allowed[\s\S]*?TRACKING_PIXEL/);
    expect(rateBlockMatch).toBeTruthy();
  });
});
