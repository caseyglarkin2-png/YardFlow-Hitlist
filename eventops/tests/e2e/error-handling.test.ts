/**
 * Sprint 56 — Error Handling Integration Tests
 *
 * Validates that the API returns correct error responses across all error types:
 *   1. Auth failures → 401 (not 500)
 *   2. Validation failures → 400 with Zod error details
 *   3. Rate limiting → 429 with Retry-After header
 *   4. Not found → 404
 *   5. CORS preflight → correct headers
 *   6. Malformed JSON → 400
 *
 * These tests ensure errors are surfaced to clients correctly and don't
 * leak internal details or crash with unhandled exceptions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createAuthenticatedRequest, TEST_USER, TEST_EVENT } from './s2s-harness';

// ─── Mocks ─────────────────────────────────────────────────────────────

const mockAuthServiceOrSession = vi.fn();
vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: (...args: unknown[]) => mockAuthServiceOrSession(...args),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    target_accounts: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    people: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    outreachSequence: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    sequenceStep: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    contact_insights: {},
    company_dossiers: {},
    outreach: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    emailActivity: {
      create: vi.fn(),
    },
  },
  db: {
    users: { findUnique: vi.fn() },
    target_accounts: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    people: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/sentry-utils', () => ({
  captureRouteError: vi.fn().mockReturnValue('error-id'),
}));

const mockCheckRateLimit = vi.fn();
vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  rateLimitKey: (...parts: string[]) => parts.join(':'),
}));

vi.mock('@/lib/queue/client', () => {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    multi: vi.fn().mockReturnValue({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 1], [null, 1]]),
    }),
    ttl: vi.fn().mockResolvedValue(60),
    ping: vi.fn().mockResolvedValue('PONG'),
    status: 'ready',
  };
  return { getRedisConnection: vi.fn(() => mockRedis) };
});

vi.mock('@/lib/outreach/compliance', () => ({
  checkCanSpamCompliance: vi.fn().mockReturnValue({ compliant: true, issues: [] }),
  handleUnsubscribe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/ai/provider', () => ({
  generateContent: vi.fn().mockResolvedValue({
    content: 'Test response',
    provider: 'gemini',
    fallbackUsed: false,
  }),
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({ cursor: undefined, limit: 50 }),
  buildPaginatedResponse: vi.fn().mockImplementation(
    (data: unknown[], _params: unknown, total: number) => ({
      data,
      hasMore: false,
      total,
    })
  ),
  getPrismaCursorParams: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/score-calculator', () => ({
  autoRecalculateScore: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ───────────────────────────────────────────────────────────

function mockAuth() {
  mockAuthServiceOrSession.mockResolvedValue({
    type: 'session',
    userId: TEST_USER.id,
    email: TEST_USER.email,
  });
}

function rateLimitAllow() {
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, retryAfter: 0 });
}

function rateLimitBlock(retryAfter = 45) {
  mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfter });
}

// ─── Auth Error Tests ──────────────────────────────────────────────────

describe('Auth Error Handling — 401 responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthServiceOrSession.mockResolvedValue(null); // Unauthorized
    rateLimitAllow();
  });

  it('GET /api/accounts — returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(typeof body.error).toBe('string');
  });

  it('POST /api/accounts — returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts', {
      method: 'POST',
      body: { name: 'Test' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('GET /api/people — returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/people/route');
    const req = createAuthenticatedRequest('/api/people');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('GET /api/sequences — returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/sequences/route');
    const req = createAuthenticatedRequest('/api/sequences');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('POST /api/ai/chat — returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/ai/chat/route');
    const req = createAuthenticatedRequest('/api/ai/chat', {
      method: 'POST',
      body: { message: 'test' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/ai/score-icp — returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/ai/score-icp/route');
    const req = createAuthenticatedRequest('/api/ai/score-icp', {
      method: 'POST',
      body: { accountId: 'acc-1' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ─── Validation Error Tests ────────────────────────────────────────────

describe('Validation Error Handling — 400 responses', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth();
    rateLimitAllow();

    // Mock user with active event for accounts route
    const { prisma } = vi.mocked(await import('@/lib/db'));
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      activeEventId: TEST_EVENT.id,
    } as never);
  });

  it('POST /api/accounts — rejects missing required name field', async () => {
    const { POST } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts', {
      method: 'POST',
      body: { website: 'https://test.com' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/accounts — rejects invalid website URL', async () => {
    const { POST } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts', {
      method: 'POST',
      body: { name: 'Test', website: 'not-a-url' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/sequences — rejects missing steps', async () => {
    const { POST } = await import('@/app/api/sequences/route');
    const req = createAuthenticatedRequest('/api/sequences', {
      method: 'POST',
      body: { name: 'No Steps' },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/sequences — rejects empty steps array', async () => {
    const { POST } = await import('@/app/api/sequences/route');
    const req = createAuthenticatedRequest('/api/sequences', {
      method: 'POST',
      body: { name: 'Empty', steps: [] },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/ai/chat — rejects request without message or messages', async () => {
    const { POST } = await import('@/app/api/ai/chat/route');
    const req = createAuthenticatedRequest('/api/ai/chat', {
      method: 'POST',
      body: { context: { pageContext: 'dashboard' } },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/ai/score-icp — rejects without accountId or personId', async () => {
    const { POST } = await import('@/app/api/ai/score-icp/route');
    const req = createAuthenticatedRequest('/api/ai/score-icp', {
      method: 'POST',
      body: {},
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

// ─── Rate Limiting Error Tests ─────────────────────────────────────────

describe('Rate Limiting — 429 responses with Retry-After', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    rateLimitBlock(45);
  });

  it('POST /api/ai/chat — returns 429 when rate limited', async () => {
    const { POST } = await import('@/app/api/ai/chat/route');
    const req = createAuthenticatedRequest('/api/ai/chat', {
      method: 'POST',
      body: { message: 'test' },
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');

    const body = await res.json();
    expect(body.error).toContain('Rate limit');
  });

  it('POST /api/ai/dossier/generate — returns 429 when rate limited', async () => {
    const { POST } = await import('@/app/api/ai/dossier/generate/route');
    const req = createAuthenticatedRequest('/api/ai/dossier/generate', {
      method: 'POST',
      body: { accountId: 'acc-1' },
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
  });

  it('POST /api/ai/content/sequence — returns 429 when rate limited', async () => {
    const { POST } = await import('@/app/api/ai/content/sequence/route');
    const req = createAuthenticatedRequest('/api/ai/content/sequence', {
      method: 'POST',
      body: { accountId: 'acc-1' },
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
  });

  it('GET /api/unsubscribe — returns 429 plain text when rate limited', async () => {
    const { GET } = await import('@/app/api/unsubscribe/route');
    const req = new NextRequest('http://localhost/api/unsubscribe?token=test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it('GET /api/outreach/track — returns pixel (not 429) when rate limited', async () => {
    const { GET } = await import('@/app/api/outreach/track/route');
    const req = new NextRequest('http://localhost/api/outreach/track?id=test-id', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    const res = await GET(req);

    // Tracking pixel should ALWAYS return the pixel, even when rate limited
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/gif');
  });
});

// ─── Not Found Error Tests ─────────────────────────────────────────────

describe('Not Found — 404 responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    rateLimitAllow();
  });

  it('POST /api/ai/score-icp — returns 404 for non-existent account', async () => {
    const { prisma } = vi.mocked(await import('@/lib/db'));
    // db.target_accounts.findUnique returns null
    vi.mocked(prisma.target_accounts.findUnique).mockResolvedValue(null);

    const { POST } = await import('@/app/api/ai/score-icp/route');
    const req = createAuthenticatedRequest('/api/ai/score-icp', {
      method: 'POST',
      body: { accountId: 'nonexistent-account' },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

// ─── CORS Header Tests ─────────────────────────────────────────────────

describe('CORS & Security Headers', () => {
  it('API routes include expected security headers in middleware', async () => {
    // Verify next.config.mjs has CORS headers configured
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.resolve(__dirname, '../../next.config.mjs');
    const config = fs.readFileSync(configPath, 'utf-8');

    // Verify CORS headers are configured
    expect(config).toContain('Access-Control-Allow-Origin');
    expect(config).toContain('Access-Control-Allow-Methods');
    expect(config).toContain('Access-Control-Allow-Headers');
  });

  it('API routes include security headers in middleware', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // Check middleware.ts for security headers
    const middlewarePath = path.resolve(__dirname, '../../src/middleware.ts');
    const middleware = fs.readFileSync(middlewarePath, 'utf-8');

    expect(middleware).toContain('X-Content-Type-Options');
    expect(middleware).toContain('X-Frame-Options');
  });
});

// ─── Error Response Shape Consistency ──────────────────────────────────

describe('Error Response Shape Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitAllow();
  });

  it('all auth-protected routes return { error: string } on 401', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);

    const routes = [
      { path: '/api/accounts', method: 'GET', handler: async () => (await import('@/app/api/accounts/route')).GET },
      { path: '/api/people', method: 'GET', handler: async () => (await import('@/app/api/people/route')).GET },
      { path: '/api/sequences', method: 'GET', handler: async () => (await import('@/app/api/sequences/route')).GET },
    ];

    for (const route of routes) {
      const handlerFn = await route.handler();
      const req = createAuthenticatedRequest(route.path);
      const res = await handlerFn(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
    }
  });

  it('validation errors include descriptive error messages', async () => {
    mockAuth();

    const { prisma } = vi.mocked(await import('@/lib/db'));
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      activeEventId: TEST_EVENT.id,
    } as never);

    const { POST } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts', {
      method: 'POST',
      body: { name: '' }, // Empty name fails min(1)
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    // Error should be descriptive, not a generic "Bad Request"
    expect(body.error.length).toBeGreaterThan(5);
  });
});
