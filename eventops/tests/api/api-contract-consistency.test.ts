/**
 * API Contract Consistency Tests
 *
 * Sprint 58: Ensures all list endpoints return { data: [...] } shape
 * to prevent frontend "L.data.map is not a function" errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
vi.mock('@/lib/db', () => ({
  prisma: {
    message_templates: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    outreachSequence: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    campaigns: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    users: {
      findUnique: vi.fn().mockResolvedValue({ activeEventId: 'test-event' }),
    },
  },
}));

vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: vi.fn().mockResolvedValue({
    type: 'session',
    userId: 'test-user-id',
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/sentry-utils', () => ({
  captureRouteError: vi.fn(),
}));

function createMockRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe('API Contract: List Endpoint Response Shapes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/api/templates', () => {
    it('returns { data: [...] } shape', async () => {
      const { GET } = await import('@/app/api/templates/route');
      const request = createMockRequest('/api/templates');
      const response = await GET(request);
      const body = await response.json();

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.templates).toBeUndefined();
    });

    it('includes pagination object', async () => {
      const { GET } = await import('@/app/api/templates/route');
      const request = createMockRequest('/api/templates');
      const response = await GET(request);
      const body = await response.json();

      expect(body.pagination).toBeDefined();
      expect(typeof body.pagination.total).toBe('number');
      expect(typeof body.pagination.limit).toBe('number');
      expect(typeof body.pagination.offset).toBe('number');
    });

    it('returns { error: string } on auth failure', async () => {
      const { authServiceOrSession } = await import('@/lib/auth-service');
      vi.mocked(authServiceOrSession).mockResolvedValueOnce(null);

      const { GET } = await import('@/app/api/templates/route');
      const request = createMockRequest('/api/templates');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(typeof body.error).toBe('string');
      expect(body.data).toBeUndefined();
    });
  });

  describe('/api/sequences', () => {
    it('returns { data: [...] } shape', async () => {
      const { GET } = await import('@/app/api/sequences/route');
      const request = createMockRequest('/api/sequences');
      const response = await GET(request);
      const body = await response.json();

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.sequences).toBeUndefined();
    });

    it('returns { error: string } on auth failure', async () => {
      const { authServiceOrSession } = await import('@/lib/auth-service');
      vi.mocked(authServiceOrSession).mockResolvedValueOnce(null);

      const { GET } = await import('@/app/api/sequences/route');
      const request = createMockRequest('/api/sequences');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(typeof body.error).toBe('string');
    });
  });

  describe('/api/campaigns', () => {
    it('returns { data: [...] } shape', async () => {
      const { GET } = await import('@/app/api/campaigns/route');
      const request = createMockRequest('/api/campaigns');
      const response = await GET(request);
      const body = await response.json();

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.campaigns).toBeUndefined();
    });

    it('returns { data: [] } when no active event', async () => {
      const { prisma } = await import('@/lib/db');
      vi.mocked(prisma.users.findUnique).mockResolvedValueOnce({
        activeEventId: null,
      } as ReturnType<typeof prisma.users.findUnique> extends Promise<infer R> ? R : never);

      const { GET } = await import('@/app/api/campaigns/route');
      const request = createMockRequest('/api/campaigns');
      const response = await GET(request);
      const body = await response.json();

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('returns { error: string } on auth failure', async () => {
      const { authServiceOrSession } = await import('@/lib/auth-service');
      vi.mocked(authServiceOrSession).mockResolvedValueOnce(null);

      const { GET } = await import('@/app/api/campaigns/route');
      const request = createMockRequest('/api/campaigns');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(typeof body.error).toBe('string');
    });
  });
});

describe('API Contract: Success Response Standards', () => {
  it('list endpoints should never return bare arrays', async () => {
    const { prisma } = await import('@/lib/db');
    vi.mocked(prisma.message_templates.findMany).mockResolvedValue([
      { id: '1', name: 'Test' } as ReturnType<
        typeof prisma.message_templates.findMany
      > extends Promise<infer R>
        ? R[number]
        : never,
    ]);
    vi.mocked(prisma.outreachSequence.findMany).mockResolvedValue([
      { id: '1', name: 'Test' } as ReturnType<
        typeof prisma.outreachSequence.findMany
      > extends Promise<infer R>
        ? R[number]
        : never,
    ]);
    vi.mocked(prisma.campaigns.findMany).mockResolvedValue([
      { id: '1', name: 'Test' } as ReturnType<typeof prisma.campaigns.findMany> extends Promise<
        infer R
      >
        ? R[number]
        : never,
    ]);

    const endpoints = [
      () => import('@/app/api/templates/route').then((m) => m.GET),
      () => import('@/app/api/sequences/route').then((m) => m.GET),
      () => import('@/app/api/campaigns/route').then((m) => m.GET),
    ];

    for (const getEndpoint of endpoints) {
      const GET = await getEndpoint();
      const request = createMockRequest('/test');
      const response = await GET(request);
      const body = await response.json();

      // Response should be an object, not an array
      expect(Array.isArray(body)).toBe(false);
      expect(typeof body).toBe('object');
    }
  });

  it('error responses should always have error property', async () => {
    const { authServiceOrSession } = await import('@/lib/auth-service');
    vi.mocked(authServiceOrSession).mockResolvedValue(null);

    const endpoints = [
      () => import('@/app/api/templates/route').then((m) => m.GET),
      () => import('@/app/api/sequences/route').then((m) => m.GET),
      () => import('@/app/api/campaigns/route').then((m) => m.GET),
    ];

    for (const getEndpoint of endpoints) {
      const GET = await getEndpoint();
      const request = createMockRequest('/test');
      const response = await GET(request);
      const body = await response.json();

      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
    }
  });
});
