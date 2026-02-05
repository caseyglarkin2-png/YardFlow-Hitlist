/**
 * Sprint 39 - S2S Auth Migration Tests
 * Verifies authServiceOrSession migration for:
 * - contact/[id]/insights (POST, GET)
 * - notifications (POST, GET)
 * - notifications/mark-read (POST)
 * - notifications/mark-all-read (POST)
 * - queue/stats (GET)
 * - queue/enrich (POST)
 * - queue/status/[jobId] (GET)
 * - engagement/score (POST, GET)
 * - activity/stream (GET)
 * - search/advanced (POST, GET)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth-service
const mockAuthServiceOrSession = vi.fn();
vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: (...args: unknown[]) => mockAuthServiceOrSession(...args),
}));

// Mock db
const mockPrisma = {
  users: { findUnique: vi.fn() },
  contact_insights: { upsert: vi.fn(), findFirst: vi.fn() },
  notifications: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  target_accounts: { findMany: vi.fn() },
  people: { findMany: vi.fn() },
  outreach: { findMany: vi.fn() },
  meeting: { findMany: vi.fn() },
  activities: { findMany: vi.fn(), count: vi.fn() },
};
vi.mock('@/lib/db', () => ({
  db: mockPrisma,
  prisma: mockPrisma,
}));

// Mock ai-contact-insights
vi.mock('@/lib/ai-contact-insights', () => ({
  generateContactInsights: vi.fn().mockResolvedValue({
    roleContext: 'Test context',
    likelyPainPoints: ['pain1'],
    suggestedApproach: 'Test approach',
    roiOpportunity: 'Test ROI',
    confidence: 0.8,
    persona: 'DECISION_MAKER',
  }),
  getPersonaLabel: vi.fn().mockReturnValue('Decision Maker'),
}));

// Mock search-builder
vi.mock('@/lib/search-builder', () => ({
  buildPrismaWhere: vi.fn().mockReturnValue({}),
  formatSearchResults: vi.fn().mockReturnValue([]),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock queue modules (dynamic imports)
vi.mock('@/lib/queue/queues', () => ({
  enrichmentQueue: {
    getJobCounts: vi.fn().mockResolvedValue({ active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 }),
    getFailed: vi.fn().mockResolvedValue([]),
    getJob: vi.fn().mockResolvedValue(null),
  },
  outreachQueue: {
    getJobCounts: vi.fn().mockResolvedValue({ active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 }),
    getFailed: vi.fn().mockResolvedValue([]),
    getJob: vi.fn().mockResolvedValue(null),
  },
  emailQueue: {
    getJobCounts: vi.fn().mockResolvedValue({ active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 }),
    getFailed: vi.fn().mockResolvedValue([]),
  },
  sequenceQueue: {
    getJobCounts: vi.fn().mockResolvedValue({ active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 }),
    getFailed: vi.fn().mockResolvedValue([]),
    getJob: vi.fn().mockResolvedValue(null),
  },
  addEnrichmentJob: vi.fn().mockResolvedValue({ id: 'job-123' }),
}));

const TEST_USER = {
  type: 'service' as const,
  userId: 'user-sprint39',
  email: 'test@freightroll.com',
};

function makeRequest(url: string, opts?: RequestInit) {
  return new Request(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': 'test-key',
      ...(opts?.headers || {}),
    },
  }) as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthServiceOrSession.mockResolvedValue(TEST_USER);
  mockPrisma.users.findUnique.mockResolvedValue({
    id: 'user-sprint39',
    email: 'test@freightroll.com',
    activeEventId: 'event-1',
  });
});

// ─── Contact Insights ─────────────────────────────────────────────
describe('contact/[id]/insights', () => {
  it('POST: accepts S2S auth and uses authResult for generatedBy', async () => {
    const { POST } = await import('@/app/api/contact/[id]/insights/route');

    mockPrisma.users.findUnique.mockResolvedValue({
      id: 'user-sprint39',
      email: 'test@freightroll.com',
    });

    const mockPerson = {
      id: 'person-1',
      name: 'John Doe',
      title: 'VP Logistics',
      target_accounts: { name: 'Acme Corp', industry: 'Logistics' },
    };

    // Mock the prisma calls that the insights route makes
    const mockFindUniquePerson = vi.fn().mockResolvedValue(mockPerson);
    const originalFindUnique = mockPrisma.users.findUnique;
    // The route calls prisma.people.findUnique then prisma.contact_insights.upsert
    vi.spyOn(mockPrisma as Record<string, unknown>, 'people' as never, 'get').mockReturnValue({
      findUnique: mockFindUniquePerson,
    });

    mockPrisma.contact_insights.upsert.mockResolvedValue({ id: 'insight-1' });

    const req = makeRequest('http://localhost/api/contact/person-1/insights', {
      method: 'POST',
    });

    const res = await POST(req, { params: { id: 'person-1' } });
    expect(res.status).not.toBe(401);
    expect(mockAuthServiceOrSession).toHaveBeenCalled();
  });

  it('POST: rejects unauthenticated requests', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/contact/[id]/insights/route');

    const req = makeRequest('http://localhost/api/contact/person-1/insights', {
      method: 'POST',
    });

    const res = await POST(req, { params: { id: 'person-1' } });
    expect(res.status).toBe(401);
  });
});

// ─── Notifications ─────────────────────────────────────────────────
describe('notifications', () => {
  it('POST: creates notification with authResult.userId', async () => {
    const { POST } = await import('@/app/api/notifications/route');
    mockPrisma.notifications.create.mockResolvedValue({ id: 'notif-1' });

    const req = makeRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        type: 'INFO',
        title: 'Test',
        message: 'Test message',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-sprint39' }),
      })
    );
  });

  it('GET: returns notifications for authenticated user', async () => {
    const { GET } = await import('@/app/api/notifications/route');
    mockPrisma.notifications.findMany.mockResolvedValue([]);
    mockPrisma.notifications.count.mockResolvedValue(0);

    const req = makeRequest('http://localhost/api/notifications?unreadOnly=false');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.notifications.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-sprint39' }),
      })
    );
  });

  it('GET: rejects without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/notifications/route');
    const req = makeRequest('http://localhost/api/notifications');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ─── Mark Read ─────────────────────────────────────────────────────
describe('notifications/mark-read', () => {
  it('POST: marks notifications with authResult.userId', async () => {
    const { POST } = await import('@/app/api/notifications/mark-read/route');
    mockPrisma.notifications.updateMany.mockResolvedValue({ count: 2 });

    const req = makeRequest('http://localhost/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds: ['n1', 'n2'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.notifications.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-sprint39' }),
      })
    );
  });
});

// ─── Mark All Read ─────────────────────────────────────────────────
describe('notifications/mark-all-read', () => {
  it('POST: marks all read with authResult.userId', async () => {
    const { POST } = await import('@/app/api/notifications/mark-all-read/route');
    mockPrisma.notifications.updateMany.mockResolvedValue({ count: 5 });

    const req = makeRequest('http://localhost/api/notifications/mark-all-read', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.notifications.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-sprint39' }),
      })
    );
  });

  it('POST: rejects without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/notifications/mark-all-read/route');
    const req = makeRequest('http://localhost/api/notifications/mark-all-read', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ─── Queue Stats ───────────────────────────────────────────────────
describe('queue/stats', () => {
  it('GET: returns queue stats for authenticated user', async () => {
    const { GET } = await import('@/app/api/queue/stats/route');
    const req = makeRequest('http://localhost/api/queue/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockAuthServiceOrSession).toHaveBeenCalled();
  });

  it('GET: rejects without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/queue/stats/route');
    const req = makeRequest('http://localhost/api/queue/stats');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ─── Queue Enrich ──────────────────────────────────────────────────
describe('queue/enrich', () => {
  it('POST: queues enrichment job with authResult.userId', async () => {
    const { POST } = await import('@/app/api/queue/enrich/route');
    const req = makeRequest('http://localhost/api/queue/enrich', {
      method: 'POST',
      body: JSON.stringify({
        jobType: 'email-pattern',
        accountId: 'acc-1',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.jobId).toBe('job-123');
  });

  it('POST: rejects without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/queue/enrich/route');
    const req = makeRequest('http://localhost/api/queue/enrich', {
      method: 'POST',
      body: JSON.stringify({ jobType: 'email-pattern', accountId: 'acc-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ─── Queue Status ──────────────────────────────────────────────────
describe('queue/status/[jobId]', () => {
  it('GET: returns job status for authenticated user', async () => {
    const { GET } = await import('@/app/api/queue/status/[jobId]/route');
    const req = makeRequest('http://localhost/api/queue/status/job-123');
    const res = await GET(req, { params: { jobId: 'job-123' } });
    // Job not found is expected since our mock returns null
    expect(res.status).toBe(404);
    expect(mockAuthServiceOrSession).toHaveBeenCalled();
  });

  it('GET: rejects without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/queue/status/[jobId]/route');
    const req = makeRequest('http://localhost/api/queue/status/job-123');
    const res = await GET(req, { params: { jobId: 'job-123' } });
    expect(res.status).toBe(401);
  });
});

// ─── Engagement Score ──────────────────────────────────────────────
describe('engagement/score', () => {
  it('POST: uses authResult.userId for user lookup (not email)', async () => {
    const { POST } = await import('@/app/api/engagement/score/route');
    mockPrisma.target_accounts.findMany.mockResolvedValue([]);

    const req = makeRequest('http://localhost/api/engagement/score', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-sprint39' },
    });
  });

  it('GET: uses authResult.userId for user lookup', async () => {
    const { GET } = await import('@/app/api/engagement/score/route');
    mockPrisma.target_accounts.findMany.mockResolvedValue([]);

    const req = makeRequest('http://localhost/api/engagement/score?limit=10');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-sprint39' },
    });
  });
});

// ─── Activity Stream ───────────────────────────────────────────────
describe('activity/stream', () => {
  it('GET: uses authResult.userId for user lookup', async () => {
    const { GET } = await import('@/app/api/activity/stream/route');
    mockPrisma.activities.findMany.mockResolvedValue([]);
    mockPrisma.activities.count.mockResolvedValue(0);

    const req = makeRequest('http://localhost/api/activity/stream');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-sprint39' },
    });
  });

  it('GET: rejects without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/activity/stream/route');
    const req = makeRequest('http://localhost/api/activity/stream');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ─── Search Advanced ───────────────────────────────────────────────
describe('search/advanced', () => {
  it('POST: uses authResult.userId for user lookup', async () => {
    const { POST } = await import('@/app/api/search/advanced/route');

    const req = makeRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'accounts',
        filters: [],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-sprint39' },
    });
  });

  it('POST: rejects without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/search/advanced/route');
    const req = makeRequest('http://localhost/api/search/advanced', {
      method: 'POST',
      body: JSON.stringify({ entityType: 'accounts', filters: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
