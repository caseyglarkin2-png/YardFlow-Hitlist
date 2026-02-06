/**
 * Sprint 44 — Tests for src/lib/queue/client.ts
 *
 * Validates Redis lazy initialization, URL parsing, singleton behavior,
 * and graceful shutdown.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock Redis class ---
const mockQuit = vi.fn().mockResolvedValue('OK');
const mockOn = vi.fn();

const MockRedisInstance = {
  quit: mockQuit,
  on: mockOn,
};

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({ ...MockRedisInstance })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('queue/client.ts — Redis connection management', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module to clear singleton between tests
    vi.resetModules();
    // Reset env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('getRedisConnection returns a Redis instance', async () => {
    process.env.REDIS_URL = 'redis://default:password123@redis.host.com:6380';

    vi.doMock('ioredis', () => ({
      Redis: vi.fn().mockImplementation(() => ({ ...MockRedisInstance })),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection } = await import('@/lib/queue/client');
    const conn = getRedisConnection();
    expect(conn).toBeDefined();
    expect(conn.quit).toBeDefined();
  });

  it('getRedisConnection returns singleton on repeated calls', async () => {
    process.env.REDIS_URL = 'redis://default:pass@host:6379';

    vi.doMock('ioredis', () => ({
      Redis: vi.fn().mockImplementation(() => ({ ...MockRedisInstance })),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection } = await import('@/lib/queue/client');
    const conn1 = getRedisConnection();
    const conn2 = getRedisConnection();
    expect(conn1).toBe(conn2);
  });

  it('parses valid REDIS_URL correctly', async () => {
    process.env.REDIS_URL = 'redis://default:mypassword@myhost.railway.app:6380';

    const RedisMock = vi.fn().mockImplementation(() => ({ ...MockRedisInstance }));
    vi.doMock('ioredis', () => ({ Redis: RedisMock }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection } = await import('@/lib/queue/client');
    getRedisConnection();

    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'myhost.railway.app',
        port: 6380,
        password: 'mypassword',
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      })
    );
  });

  it('falls back to env vars when REDIS_URL is invalid', async () => {
    process.env.REDIS_URL = 'not-a-valid-url';
    process.env.REDIS_HOST = 'fallback-host';
    process.env.REDIS_PORT = '6381';
    process.env.REDIS_PASSWORD = 'fallback-pass';

    const RedisMock = vi.fn().mockImplementation(() => ({ ...MockRedisInstance }));
    vi.doMock('ioredis', () => ({ Redis: RedisMock }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection } = await import('@/lib/queue/client');
    getRedisConnection();

    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'fallback-host',
        port: 6381,
        password: 'fallback-pass',
      })
    );
  });

  it('defaults to localhost:6379 when no env vars set', async () => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;

    const RedisMock = vi.fn().mockImplementation(() => ({ ...MockRedisInstance }));
    vi.doMock('ioredis', () => ({ Redis: RedisMock }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection } = await import('@/lib/queue/client');
    getRedisConnection();

    expect(RedisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        port: 6379,
        password: undefined,
      })
    );
  });

  it('always sets maxRetriesPerRequest to null (BullMQ requirement)', async () => {
    delete process.env.REDIS_URL;

    const RedisMock = vi.fn().mockImplementation(() => ({ ...MockRedisInstance }));
    vi.doMock('ioredis', () => ({ Redis: RedisMock }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection } = await import('@/lib/queue/client');
    getRedisConnection();

    expect(RedisMock).toHaveBeenCalledWith(expect.objectContaining({ maxRetriesPerRequest: null }));
  });

  it('registers event handlers on new connection', async () => {
    process.env.REDIS_URL = 'redis://default:pass@host:6379';

    const onMock = vi.fn();
    vi.doMock('ioredis', () => ({
      Redis: vi.fn().mockImplementation(() => ({ ...MockRedisInstance, on: onMock })),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection } = await import('@/lib/queue/client');
    getRedisConnection();

    const registeredEvents = onMock.mock.calls.map((call: unknown[]) => call[0]);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('ready');
    expect(registeredEvents).toContain('error');
    expect(registeredEvents).toContain('close');
  });

  it('closeRedis calls quit and resets singleton', async () => {
    process.env.REDIS_URL = 'redis://default:pass@host:6379';

    const quitMock = vi.fn().mockResolvedValue('OK');
    vi.doMock('ioredis', () => ({
      Redis: vi.fn().mockImplementation(() => ({ ...MockRedisInstance, quit: quitMock })),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { getRedisConnection, closeRedis } = await import('@/lib/queue/client');

    // Create a connection first
    getRedisConnection();
    await closeRedis();

    expect(quitMock).toHaveBeenCalledOnce();

    // After closing, a new call should create a fresh instance
    const newConn = getRedisConnection();
    expect(newConn).toBeDefined();
  });

  it('closeRedis is safe when no connection exists', async () => {
    vi.doMock('ioredis', () => ({
      Redis: vi.fn().mockImplementation(() => ({ ...MockRedisInstance })),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { closeRedis } = await import('@/lib/queue/client');
    // Should not throw
    await expect(closeRedis()).resolves.toBeUndefined();
  });
});
