/**
 * Sprint 40.5 - Google OAuth S2S Auth Migration Tests
 *
 * Validates that 6 Google OAuth routes now support both
 * S2S (service-to-service) and session-based auth via authServiceOrSession.
 * google/connect intentionally kept with auth() (user-interactive redirect).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth-service
const mockAuthServiceOrSession = vi.fn();
vi.mock('@/lib/auth-service', () => ({
  authServiceOrSession: (...args: unknown[]) => mockAuthServiceOrSession(...args),
}));

// Mock db
const mockPrisma = {
  activities: { create: vi.fn().mockResolvedValue({}) },
  users: {
    update: vi.fn().mockResolvedValue({ googleSyncPaused: false, googleSyncDryRun: false }),
    findUnique: vi.fn().mockResolvedValue({ email: 'admin@freightroll.com' }),
  },
};
vi.mock('@/lib/db', () => ({ prisma: mockPrisma, db: mockPrisma }));

// Mock google modules
vi.mock('@/lib/google/auth', () => ({
  disconnectGoogle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/google/calendar', () => ({
  syncCalendarEvents: vi.fn().mockResolvedValue({ synced: 5 }),
}));

vi.mock('@/lib/google/contacts', () => ({
  importGoogleContacts: vi.fn().mockResolvedValue({ imported: 10 }),
}));

vi.mock('@/lib/google/gmail', () => ({
  checkEmailReplies: vi.fn().mockResolvedValue({ replies: 3 }),
}));

vi.mock('@/lib/google/circuit-breaker', () => ({
  googleCircuitBreaker: {
    call: vi.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
    getStatus: vi.fn().mockReturnValue({ state: 'closed', failures: 0 }),
  },
}));

vi.mock('@/lib/google/sync-state', () => ({
  setGlobalSyncEnabled: vi.fn(),
  getGlobalSyncEnabled: vi.fn().mockReturnValue(true),
}));

function mockRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const url = 'http://localhost:3000/api/test';
  const opts: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { 'content-type': 'application/json', ...headers },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
}

const S2S_AUTH = {
  type: 'service' as const,
  userId: 'user-s2s-123',
  email: 'agent@freightroll.com',
};
const SESSION_AUTH = {
  type: 'session' as const,
  userId: 'user-sess-456',
  email: 'user@freightroll.com',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Google Disconnect
// ============================================================
describe('Google Disconnect - POST /api/google/disconnect', () => {
  it('rejects unauthenticated requests', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/google/disconnect/route');
    const res = await POST(mockRequest('POST') as never);
    expect(res.status).toBe(401);
  });

  it('disconnects via S2S auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { disconnectGoogle } = await import('@/lib/google/auth');
    const { POST } = await import('@/app/api/google/disconnect/route');
    const res = await POST(mockRequest('POST', undefined, { 'x-service-key': 'test' }) as never);
    expect(res.status).toBe(200);
    expect(disconnectGoogle).toHaveBeenCalledWith('user-s2s-123');
  });

  it('disconnects via session auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(SESSION_AUTH);
    const { disconnectGoogle } = await import('@/lib/google/auth');
    const { POST } = await import('@/app/api/google/disconnect/route');
    const res = await POST(mockRequest('POST') as never);
    expect(res.status).toBe(200);
    expect(disconnectGoogle).toHaveBeenCalledWith('user-sess-456');
  });
});

// ============================================================
// Google Calendar Sync
// ============================================================
describe('Google Calendar Sync - POST /api/google/calendar/sync', () => {
  it('rejects unauthenticated requests', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/google/calendar/sync/route');
    const res = await POST(mockRequest('POST', { dryRun: true }) as never);
    expect(res.status).toBe(401);
  });

  it('syncs calendar via S2S auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { syncCalendarEvents } = await import('@/lib/google/calendar');
    const { POST } = await import('@/app/api/google/calendar/sync/route');
    const res = await POST(mockRequest('POST', { dryRun: false, days: 7 }) as never);
    expect(res.status).toBe(200);
    expect(syncCalendarEvents).toHaveBeenCalledWith('user-s2s-123', { dryRun: false, days: 7 });
  });
});

// ============================================================
// Google Contacts Import
// ============================================================
describe('Google Contacts Import - POST /api/google/contacts/import', () => {
  it('rejects unauthenticated requests', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/google/contacts/import/route');
    const res = await POST(mockRequest('POST', { eventId: 'evt-1' }) as never);
    expect(res.status).toBe(401);
  });

  it('requires eventId', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { POST } = await import('@/app/api/google/contacts/import/route');
    const res = await POST(mockRequest('POST', {}) as never);
    expect(res.status).toBe(400);
  });

  it('imports contacts via S2S auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { importGoogleContacts } = await import('@/lib/google/contacts');
    const { POST } = await import('@/app/api/google/contacts/import/route');
    const res = await POST(mockRequest('POST', { eventId: 'evt-1', dryRun: true }) as never);
    expect(res.status).toBe(200);
    expect(importGoogleContacts).toHaveBeenCalledWith('user-s2s-123', 'evt-1', { dryRun: true });
  });
});

// ============================================================
// Gmail Check Replies
// ============================================================
describe('Gmail Check Replies - POST /api/google/gmail/check-replies', () => {
  it('rejects unauthenticated requests', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/google/gmail/check-replies/route');
    const res = await POST(mockRequest('POST') as never);
    expect(res.status).toBe(401);
  });

  it('checks replies via S2S auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { checkEmailReplies } = await import('@/lib/google/gmail');
    const { POST } = await import('@/app/api/google/gmail/check-replies/route');
    const res = await POST(mockRequest('POST', undefined, { 'x-service-key': 'test' }) as never);
    expect(res.status).toBe(200);
    expect(checkEmailReplies).toHaveBeenCalledWith('user-s2s-123');
  });
});

// ============================================================
// Google Sync Control
// ============================================================
describe('Google Sync Control - POST /api/google/sync/control', () => {
  it('rejects unauthenticated requests', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/google/sync/control/route');
    const res = await POST(mockRequest('POST', { action: 'pause' }) as never);
    expect(res.status).toBe(401);
  });

  it('pauses sync via S2S auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { POST } = await import('@/app/api/google/sync/control/route');
    const res = await POST(mockRequest('POST', { action: 'pause' }) as never);
    expect(res.status).toBe(200);
    expect(mockPrisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-s2s-123' } })
    );
  });

  it('rejects invalid actions', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { POST } = await import('@/app/api/google/sync/control/route');
    const res = await POST(mockRequest('POST', { action: 'destroy' }) as never);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Admin Google Sync Control
// ============================================================
describe('Admin Google Sync Control - /api/admin/google-sync/control', () => {
  it('rejects unauthenticated POST requests', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/google-sync/control/route');
    const res = await POST(mockRequest('POST', { action: 'enable' }) as never);
    expect(res.status).toBe(401);
  });

  it('rejects non-admin S2S users', async () => {
    mockAuthServiceOrSession.mockResolvedValue({
      type: 'service',
      userId: 'user-x',
      email: 'user@gmail.com',
    });
    const { POST } = await import('@/app/api/admin/google-sync/control/route');
    const res = await POST(mockRequest('POST', { action: 'enable' }) as never);
    expect(res.status).toBe(403);
  });

  it('allows admin S2S users with @freightroll.com email', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { POST } = await import('@/app/api/admin/google-sync/control/route');
    const res = await POST(mockRequest('POST', { action: 'enable' }) as never);
    expect(res.status).toBe(200);
  });

  it('looks up email from DB when not in authResult', async () => {
    mockAuthServiceOrSession.mockResolvedValue({ type: 'service', userId: 'user-db-lookup' });
    mockPrisma.users.findUnique.mockResolvedValue({ email: 'admin@freightroll.com' });
    const { POST } = await import('@/app/api/admin/google-sync/control/route');
    const res = await POST(mockRequest('POST', { action: 'enable' }) as never);
    expect(res.status).toBe(200);
    expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-db-lookup' },
      select: { email: true },
    });
  });

  it('rejects GET without auth', async () => {
    mockAuthServiceOrSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/google-sync/control/route');
    const res = await GET(mockRequest('GET') as never);
    expect(res.status).toBe(401);
  });

  it('allows admin GET with @freightroll.com email', async () => {
    mockAuthServiceOrSession.mockResolvedValue(S2S_AUTH);
    const { GET } = await import('@/app/api/admin/google-sync/control/route');
    const res = await GET(mockRequest('GET') as never);
    expect(res.status).toBe(200);
  });
});
