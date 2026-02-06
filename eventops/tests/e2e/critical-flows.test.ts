/**
 * Sprint 56 — Critical Flow Integration Tests
 *
 * Tests the 4 critical business flows end-to-end by calling route handlers
 * directly with mocked dependencies. Validates request/response contracts,
 * auth enforcement, and data flow between routes.
 *
 * Flows tested:
 *   1. Account lifecycle: Create → List → Score
 *   2. People lifecycle: Create → List → Detail
 *   3. Sequence lifecycle: Create → List
 *   4. AI lifecycle: Chat capabilities → Chat message → ICP Score
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  TEST_USER,
  TEST_EVENT,
  TEST_ACCOUNT,
  TEST_PERSON,
  createAuthenticatedRequest,
} from './s2s-harness';

// ─── Mocks (declared before imports) ───────────────────────────────────

const mockAuthServiceOrSession = vi.fn();
vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: (...args: unknown[]) => mockAuthServiceOrSession(...args),
}));

// Prisma model mocks
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockCount = vi.fn();
const mockFindFirst = vi.fn();

vi.mock('@/lib/db', () => {
  const targetAccountsModel = {
    findMany: (...args: unknown[]) => mockFindMany(...args),
    findUnique: (...args: unknown[]) => mockFindUnique(...args),
    findFirst: (...args: unknown[]) => mockFindFirst(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    count: (...args: unknown[]) => mockCount(...args),
  };
  const peopleModel = {
    findMany: (...args: unknown[]) => mockFindMany(...args),
    findUnique: (...args: unknown[]) => mockFindUnique(...args),
    findFirst: (...args: unknown[]) => mockFindFirst(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    count: (...args: unknown[]) => mockCount(...args),
  };
  const shared = {
    users: { findUnique: vi.fn() },
    target_accounts: targetAccountsModel,
    people: peopleModel,
    outreachSequence: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    sequenceStep: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    outreach: {
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    contact_insights: {},
    company_dossiers: {},
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  };
  return {
    prisma: shared,
    db: shared,
    getPoolMetrics: vi.fn().mockReturnValue({ totalCount: 5, idleCount: 3, waitingCount: 0 }),
  };
});

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/sentry-utils', () => ({
  captureRouteError: vi.fn().mockReturnValue('error-id'),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, retryAfter: 0 }),
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

vi.mock('@/lib/auto-recalculate', () => ({
  autoRecalculateScore: vi.fn().mockResolvedValue(undefined),
}));

const mockQueueObj = {
  getJobCounts: vi.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
  name: 'mock-queue',
};
vi.mock('@/lib/queue/queues', () => ({
  emailQueue: mockQueueObj,
  enrichmentQueue: mockQueueObj,
  outreachQueue: mockQueueObj,
  sequenceQueue: mockQueueObj,
}));

vi.mock('@/lib/ai/provider', () => ({
  generateContent: vi.fn().mockResolvedValue({
    content: 'AI response content',
    provider: 'gemini',
    fallbackUsed: false,
  }),
  checkAIHealth: vi.fn().mockResolvedValue({
    status: 'available',
    provider: 'gemini',
    latencyMs: 50,
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

function mockSessionAuth() {
  mockAuthServiceOrSession.mockResolvedValue({
    type: 'session',
    userId: TEST_USER.id,
    email: TEST_USER.email,
  });
}

function mockUnauthorized() {
  mockAuthServiceOrSession.mockResolvedValue(null);
}

/** Reset shared mock one-shot queues to prevent cross-test leaks */
function resetSharedMocks() {
  mockFindMany.mockReset();
  mockFindUnique.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockCount.mockReset();
  mockFindFirst.mockReset();
}

async function mockUserActiveEvent() {
  const { prisma } = vi.mocked(await import('@/lib/db'));
  vi.mocked(prisma.users.findUnique).mockResolvedValue({
    activeEventId: TEST_EVENT.id,
  } as never);
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('Critical Flow: Account Lifecycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetSharedMocks();
    mockSessionAuth();
    await mockUserActiveEvent();
  });

  it('POST /api/accounts — creates account with valid data', async () => {
    const newAccount = {
      ...TEST_ACCOUNT,
      id: 'acc-new',
      _count: { people: 0 },
    };
    mockCreate.mockResolvedValueOnce(newAccount);

    const { POST } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts', {
      method: 'POST',
      body: {
        name: 'Test Logistics Co',
        website: 'https://testlogistics.com',
        industry: 'logistics',
        headquarters: 'Chicago, IL',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.name).toBe('Test Logistics Co');
  });

  it('POST /api/accounts — rejects without auth', async () => {
    mockUnauthorized();

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

  it('POST /api/accounts — rejects invalid data (missing name)', async () => {
    const { POST } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts', {
      method: 'POST',
      body: { website: 'https://test.com' }, // missing required 'name'
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('GET /api/accounts — lists accounts for authenticated user', async () => {
    mockFindMany.mockResolvedValueOnce([TEST_ACCOUNT]);
    mockCount.mockResolvedValueOnce(1);

    const { GET } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts');

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  it('GET /api/accounts — returns 401 without auth', async () => {
    mockUnauthorized();

    const { GET } = await import('@/app/api/accounts/route');
    const req = createAuthenticatedRequest('/api/accounts');

    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe('Critical Flow: People Lifecycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetSharedMocks();
    mockSessionAuth();
    await mockUserActiveEvent();
  });

  it('POST /api/people — creates person linked to account', async () => {
    // Mock account lookup (uses findFirst to verify accountId belongs to user's event)
    mockFindFirst.mockResolvedValueOnce({ id: TEST_ACCOUNT.id, eventId: TEST_EVENT.id });
    mockCreate.mockResolvedValueOnce(TEST_PERSON);

    const { POST } = await import('@/app/api/people/route');
    const req = createAuthenticatedRequest('/api/people', {
      method: 'POST',
      body: {
        accountId: TEST_ACCOUNT.id,
        name: 'Jane Ops',
        title: 'VP Operations',
        email: 'jane@testlogistics.com',
        isExecOps: true,
        isOps: true,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.name).toBe('Jane Ops');
    expect(body.accountId).toBe(TEST_ACCOUNT.id);
  });

  it('POST /api/people — rejects without auth', async () => {
    mockUnauthorized();

    const { POST } = await import('@/app/api/people/route');
    const req = createAuthenticatedRequest('/api/people', {
      method: 'POST',
      body: { accountId: 'acc-1', name: 'Test' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/people — lists people with pagination', async () => {
    mockFindMany.mockResolvedValueOnce([TEST_PERSON]);
    mockCount.mockResolvedValueOnce(1);

    const { GET } = await import('@/app/api/people/route');
    const req = createAuthenticatedRequest('/api/people');

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.people).toBeDefined();
    expect(body.pagination).toBeDefined();
  });
});

describe('Critical Flow: Sequence Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSharedMocks();
    mockSessionAuth();
  });

  it('POST /api/sequences — creates sequence with steps', async () => {
    const newSequence = {
      id: 'seq-new',
      name: 'Manifest Outreach',
      description: 'Pre-event outreach',
      status: 'draft',
      createdBy: TEST_USER.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      _count: { enrollments: 0 },
    };
    mockCreate.mockResolvedValueOnce(newSequence);

    const { POST } = await import('@/app/api/sequences/route');
    const req = createAuthenticatedRequest('/api/sequences', {
      method: 'POST',
      body: {
        name: 'Manifest Outreach',
        description: 'Pre-event outreach',
        steps: [
          {
            subject: 'Connecting at Manifest 2026',
            emailBody: 'Hi {{firstName}}, excited to connect at Manifest. The FreightRoll team would love to meet.',
            delayHours: 0,
          },
        ],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.sequence || body.name).toBeDefined();
  });

  it('POST /api/sequences — rejects empty steps array', async () => {
    const { POST } = await import('@/app/api/sequences/route');
    const req = createAuthenticatedRequest('/api/sequences', {
      method: 'POST',
      body: {
        name: 'Empty Sequence',
        steps: [],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('GET /api/sequences — lists user sequences', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'seq-1',
        name: 'Test Sequence',
        description: null,
        status: 'active',
        steps: [{ stepNumber: 1, subject: 'Hello', emailBody: 'Body', delayHours: 0 }],
        _count: { enrollments: 5 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const { GET } = await import('@/app/api/sequences/route');
    const req = createAuthenticatedRequest('/api/sequences');

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sequences).toBeDefined();
    expect(Array.isArray(body.sequences)).toBe(true);
  });
});

describe('Critical Flow: AI Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSharedMocks();
    mockSessionAuth();
  });

  it('GET /api/ai/chat — returns capabilities', async () => {
    const { GET } = await import('@/app/api/ai/chat/route');
    const req = createAuthenticatedRequest('/api/ai/chat');

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ready');
    expect(body.capabilities).toBeDefined();
    expect(Array.isArray(body.capabilities)).toBe(true);
    expect(body.maxMessageLength).toBeGreaterThan(0);
    expect(body.providers).toBeDefined();
  });

  it('POST /api/ai/chat — sends message and gets response', async () => {
    const { POST } = await import('@/app/api/ai/chat/route');
    const req = createAuthenticatedRequest('/api/ai/chat', {
      method: 'POST',
      body: {
        message: 'What accounts should I prioritize for Manifest?',
        context: {
          pageContext: 'dashboard',
        },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.response).toBeDefined();
    expect(typeof body.response).toBe('string');
    expect(body.metadata).toBeDefined();
  });

  it('POST /api/ai/chat — rejects empty message', async () => {
    const { POST } = await import('@/app/api/ai/chat/route');
    const req = createAuthenticatedRequest('/api/ai/chat', {
      method: 'POST',
      body: {},
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/ai/score-icp — scores account', async () => {
    const accountWithPeople = {
      ...TEST_ACCOUNT,
      people: [TEST_PERSON],
      industry: 'Logistics',
      website: 'https://testlogistics.com',
      headquarters: 'Chicago, IL',
    };
    mockFindUnique.mockResolvedValueOnce(accountWithPeople);
    mockUpdate.mockResolvedValueOnce({ ...accountWithPeople, icpScore: 85 });

    const { POST } = await import('@/app/api/ai/score-icp/route');
    const req = createAuthenticatedRequest('/api/ai/score-icp', {
      method: 'POST',
      body: { accountId: TEST_ACCOUNT.id },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.score).toBeGreaterThanOrEqual(0);
    expect(body.score).toBeLessThanOrEqual(100);
    expect(body.grade).toMatch(/^[A-D]$/);
    expect(body.reasoning).toBeDefined();
    expect(Array.isArray(body.reasoning)).toBe(true);
    expect(body.maxScore).toBe(100);
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

describe('Critical Flow: Public Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSharedMocks();
  });

  it('GET /api/health — returns structured health check', async () => {
    // Health route checks DB, Redis, queues, email, AI — all mocked above
    const { GET } = await import('@/app/api/health/route');

    const res = await GET();
    // Should be 200 or 503 (degraded) — both are valid
    expect([200, 503]).toContain(res.status);

    const body = await res.json();
    expect(body.status).toMatch(/^(healthy|degraded)$/);
    expect(body.checks).toBeDefined();
    expect(body.timestamp).toBeDefined();
  }, 10000);

  it('GET /api/outreach/track — returns tracking pixel', async () => {
    // Mock the prisma lookup for outreach tracking
    mockFindUnique.mockResolvedValueOnce(null); // No outreach found — still returns pixel

    const { GET } = await import('@/app/api/outreach/track/route');
    const req = new NextRequest('http://localhost/api/outreach/track?id=test-outreach-id', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/gif');
  });

  it('GET /api/unsubscribe — returns HTML for valid token', async () => {
    // Mock person lookup so route proceeds to unsubscribe flow
    mockFindUnique.mockResolvedValueOnce({
      id: 'person-test-1',
      email: 'test@example.com',
      name: 'Test Person',
      unsubscribed: false,
    });

    const { GET } = await import('@/app/api/unsubscribe/route');
    const req = new NextRequest('http://localhost/api/unsubscribe?token=person-test-1', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('GET /api/unsubscribe — rejects missing token', async () => {
    const { GET } = await import('@/app/api/unsubscribe/route');
    const req = new NextRequest('http://localhost/api/unsubscribe', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
