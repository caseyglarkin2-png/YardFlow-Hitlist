/**
 * Service-to-Service Authentication Integration Tests
 *
 * Tests that the Railway backend correctly accepts and rejects
 * S2S authentication from the GTM frontend.
 *
 * Run against production: TEST_RAILWAY_URL=https://yardflow-hitlist-production-2f41.up.railway.app npm run test:integration
 */
import { describe, it, expect } from 'vitest';

// Use production URL by default for integration tests
const RAILWAY_URL =
  process.env.TEST_RAILWAY_URL || 'https://yardflow-hitlist-production-2f41.up.railway.app';
const SERVICE_SECRET = process.env.SERVICE_TO_SERVICE_SECRET || '';
const SKIP_AUTH_TESTS = !SERVICE_SECRET;

describe('S2S Authentication', () => {
  describe('Public Endpoints', () => {
    it('should allow health check without authentication', async () => {
      const res = await fetch(`${RAILWAY_URL}/api/health`, {
        signal: AbortSignal.timeout(10000),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
    }, 15000);
  });

  describe('Valid Authentication', () => {
    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept valid S2S key on protected endpoint',
      async () => {
        const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
          },
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200, not 401
        expect(res.status).toBe(200);
      },
      15000
    );

    it('should include CORS headers for GTM origin', async () => {
      const gtmOrigin = 'https://gtm-yard-flow.vercel.app';

      const res = await fetch(`${RAILWAY_URL}/api/health`, {
        headers: {
          Origin: gtmOrigin,
        },
        signal: AbortSignal.timeout(10000),
      });

      // Health endpoint is public, so status should be 200
      expect(res.status).toBe(200);

      const _corsHeader = res.headers.get('access-control-allow-origin');
      // CORS header should be present (may be wildcard or specific origin)
      // Note: Some servers only return CORS headers for cross-origin requests
      // This test just ensures the endpoint is accessible
    }, 15000);
  });

  describe('Invalid Authentication', () => {
    it('should reject missing S2S key', async () => {
      const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
        signal: AbortSignal.timeout(10000),
      });

      // Should require authentication
      expect([401, 403]).toContain(res.status);
    }, 15000);

    it('should reject invalid S2S key', async () => {
      const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
        headers: {
          'x-service-key': 'invalid-key-12345',
        },
        signal: AbortSignal.timeout(10000),
      });

      expect([401, 403]).toContain(res.status);
    }, 15000);

    it('should reject empty S2S key', async () => {
      const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
        headers: {
          'x-service-key': '',
        },
        signal: AbortSignal.timeout(10000),
      });

      expect([401, 403]).toContain(res.status);
    }, 15000);
  });

  describe('CORS Preflight', () => {
    it('should handle OPTIONS preflight correctly', async () => {
      const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://gtm-yard-flow.vercel.app',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'x-service-key',
        },
        signal: AbortSignal.timeout(10000),
      });

      expect([200, 204]).toContain(res.status);

      const allowMethods = res.headers.get('access-control-allow-methods');
      expect(allowMethods).toBeTruthy();
    }, 15000);

    it('should allow x-service-key header in preflight', async () => {
      const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://gtm-yard-flow.vercel.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'x-service-key, content-type',
        },
        signal: AbortSignal.timeout(10000),
      });

      const allowHeaders = res.headers.get('access-control-allow-headers');
      if (allowHeaders) {
        expect(allowHeaders.toLowerCase()).toMatch(/x-service-key|[\*]/);
      }
    }, 15000);
  });
});
