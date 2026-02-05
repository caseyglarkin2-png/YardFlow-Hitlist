/**
 * Sprint 43 - Auth Service Comprehensive Tests
 *
 * Tests the core auth-service module used by every API route.
 * Covers: S2S auth, cron auth, session auth, requireAuth,
 * isServiceAuth, getUserIdFromAuth, and edge cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeRequest(
  url = 'http://localhost:3000/api/test',
  headers: Record<string, string> = {},
  method = 'GET'
): Request {
  return new Request(url, {
    method,
    headers: new Headers(headers),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no env vars
  delete process.env.SERVICE_TO_SERVICE_SECRET;
  delete process.env.CRON_SECRET;
});

// ============================================================
// authServiceOrSession
// ============================================================
describe('authServiceOrSession', () => {
  describe('S2S auth (x-service-key)', () => {
    it('authenticates with valid service key', async () => {
      process.env.SERVICE_TO_SERVICE_SECRET = 'test-secret';
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          'x-service-key': 'test-secret',
        })
      );

      expect(result).toEqual({
        type: 'service',
        userId: 'service:gtm-frontend',
        email: undefined,
      });
    });

    it('uses x-user-id header when provided', async () => {
      process.env.SERVICE_TO_SERVICE_SECRET = 'test-secret';
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          'x-service-key': 'test-secret',
          'x-user-id': 'user-abc-123',
        })
      );

      expect(result).toEqual({
        type: 'service',
        userId: 'user-abc-123',
        email: undefined,
      });
    });

    it('uses x-user-email header when provided', async () => {
      process.env.SERVICE_TO_SERVICE_SECRET = 'test-secret';
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          'x-service-key': 'test-secret',
          'x-user-id': 'user-abc-123',
          'x-user-email': 'user@freightroll.com',
        })
      );

      expect(result).toEqual({
        type: 'service',
        userId: 'user-abc-123',
        email: 'user@freightroll.com',
      });
    });

    it('rejects invalid service key', async () => {
      process.env.SERVICE_TO_SERVICE_SECRET = 'correct-secret';
      mockAuth.mockResolvedValue(null);
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          'x-service-key': 'wrong-secret',
        })
      );

      expect(result).toBeNull();
    });

    it('rejects when SERVICE_TO_SERVICE_SECRET not set', async () => {
      // No env var set
      mockAuth.mockResolvedValue(null);
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          'x-service-key': 'any-key',
        })
      );

      expect(result).toBeNull();
    });
  });

  describe('Cron auth (Bearer token)', () => {
    it('authenticates with valid CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'cron-secret-123';
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/cron/job', {
          authorization: 'Bearer cron-secret-123',
        })
      );

      expect(result).toEqual({
        type: 'service',
        userId: 'service:cron',
      });
    });

    it('rejects invalid Bearer token', async () => {
      process.env.CRON_SECRET = 'correct-cron-secret';
      mockAuth.mockResolvedValue(null);
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          authorization: 'Bearer wrong-token',
        })
      );

      expect(result).toBeNull();
    });

    it('ignores non-Bearer auth headers', async () => {
      process.env.CRON_SECRET = 'secret';
      mockAuth.mockResolvedValue(null);
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          authorization: 'Basic dXNlcjpwYXNz',
        })
      );

      expect(result).toBeNull();
    });
  });

  describe('Session auth (NextAuth)', () => {
    it('authenticates with valid session', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'session-user-1',
          email: 'user@example.com',
          name: 'Test User',
        },
      });
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(makeRequest('http://localhost:3000/api/test'));

      expect(result).toEqual({
        type: 'session',
        userId: 'session-user-1',
        email: 'user@example.com',
      });
    });

    it('returns null for session without user', async () => {
      mockAuth.mockResolvedValue({ user: null });
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(makeRequest('http://localhost:3000/api/test'));

      expect(result).toBeNull();
    });

    it('returns null for session without user.id', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'no-id@test.com' } });
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(makeRequest('http://localhost:3000/api/test'));

      expect(result).toBeNull();
    });

    it('handles session auth errors gracefully', async () => {
      mockAuth.mockRejectedValue(new Error('Database connection error'));
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(makeRequest('http://localhost:3000/api/test'));

      expect(result).toBeNull();
    });

    it('converts null email to undefined', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-1', email: null },
      });
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(makeRequest('http://localhost:3000/api/test'));

      expect(result).toEqual({
        type: 'session',
        userId: 'user-1',
        email: undefined,
      });
    });
  });

  describe('Auth precedence', () => {
    it('S2S takes priority over session', async () => {
      process.env.SERVICE_TO_SERVICE_SECRET = 'service-secret';
      mockAuth.mockResolvedValue({ user: { id: 'session-user', email: 'user@test.com' } });
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          'x-service-key': 'service-secret',
          'x-user-id': 's2s-user',
        })
      );

      expect(result?.type).toBe('service');
      expect(result?.userId).toBe('s2s-user');
    });

    it('S2S takes priority over cron Bearer token', async () => {
      process.env.SERVICE_TO_SERVICE_SECRET = 'service-secret';
      process.env.CRON_SECRET = 'cron-secret';
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          'x-service-key': 'service-secret',
          authorization: 'Bearer cron-secret',
        })
      );

      expect(result?.userId).toBe('service:gtm-frontend');
    });

    it('cron Bearer takes priority over session', async () => {
      process.env.CRON_SECRET = 'cron-secret';
      mockAuth.mockResolvedValue({ user: { id: 'session-user', email: 'user@test.com' } });
      const { authServiceOrSession } = await import('@/lib/auth-service');

      const result = await authServiceOrSession(
        makeRequest('http://localhost:3000/api/test', {
          authorization: 'Bearer cron-secret',
        })
      );

      expect(result?.type).toBe('service');
      expect(result?.userId).toBe('service:cron');
    });
  });
});

// ============================================================
// requireAuth
// ============================================================
describe('requireAuth', () => {
  it('returns auth result when authenticated', async () => {
    process.env.SERVICE_TO_SERVICE_SECRET = 'test-secret';
    const { requireAuth } = await import('@/lib/auth-service');

    const result = await requireAuth(
      makeRequest('http://localhost:3000/api/test', {
        'x-service-key': 'test-secret',
        'x-user-id': 'user-1',
      })
    );

    expect(result.error).toBe(false);
    if (!result.error) {
      expect(result.auth?.userId).toBe('user-1');
    }
  });

  it('returns 401 response when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const { requireAuth } = await import('@/lib/auth-service');

    const result = await requireAuth(makeRequest('http://localhost:3000/api/test'));

    expect(result.error).toBe(true);
    if (result.error) {
      expect(result.response.status).toBe(401);
    }
  });
});

// ============================================================
// isServiceAuth
// ============================================================
describe('isServiceAuth', () => {
  it('returns true for service auth', async () => {
    const { isServiceAuth } = await import('@/lib/auth-service');
    expect(isServiceAuth({ type: 'service', userId: 'svc' })).toBe(true);
  });

  it('returns false for session auth', async () => {
    const { isServiceAuth } = await import('@/lib/auth-service');
    expect(isServiceAuth({ type: 'session', userId: 'user' })).toBe(false);
  });

  it('returns false for null', async () => {
    const { isServiceAuth } = await import('@/lib/auth-service');
    expect(isServiceAuth(null)).toBe(false);
  });
});

// ============================================================
// getUserIdFromAuth
// ============================================================
describe('getUserIdFromAuth', () => {
  it('returns userId for session auth', async () => {
    const { getUserIdFromAuth } = await import('@/lib/auth-service');

    const result = await getUserIdFromAuth({
      type: 'session',
      userId: 'user-123',
      email: 'user@test.com',
    });

    expect(result).toBe('user-123');
  });

  it('returns userId for S2S with explicit x-user-id', async () => {
    const { getUserIdFromAuth } = await import('@/lib/auth-service');

    const result = await getUserIdFromAuth({
      type: 'service',
      userId: 'user-from-header',
    });

    expect(result).toBe('user-from-header');
  });

  it('returns null for S2S with service: placeholder and no prisma', async () => {
    const { getUserIdFromAuth } = await import('@/lib/auth-service');

    const result = await getUserIdFromAuth({
      type: 'service',
      userId: 'service:gtm-frontend',
      email: 'user@test.com',
    });

    expect(result).toBeNull();
  });

  it('looks up user by email when prisma provided', async () => {
    const mockPrismaClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'db-user-456' }),
      },
    };
    const { getUserIdFromAuth } = await import('@/lib/auth-service');

    const result = await getUserIdFromAuth(
      { type: 'service', userId: 'service:cron', email: 'user@test.com' },
      mockPrismaClient
    );

    expect(result).toBe('db-user-456');
    expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@test.com' },
    });
  });

  it('returns null when DB lookup fails', async () => {
    const mockPrismaClient = {
      user: {
        findUnique: vi.fn().mockRejectedValue(new Error('DB error')),
      },
    };
    const { getUserIdFromAuth } = await import('@/lib/auth-service');

    const result = await getUserIdFromAuth(
      { type: 'service', userId: 'service:cron', email: 'user@test.com' },
      mockPrismaClient
    );

    expect(result).toBeNull();
  });

  it('returns null for null authResult', async () => {
    const { getUserIdFromAuth } = await import('@/lib/auth-service');
    const result = await getUserIdFromAuth(null);
    expect(result).toBeNull();
  });
});
