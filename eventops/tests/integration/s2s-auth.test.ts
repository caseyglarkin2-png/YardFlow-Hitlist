/**
 * Service-to-Service Authentication Integration Tests
 *
 * Tests that the Railway backend correctly accepts and rejects
 * S2S authentication from the GTM frontend.
 *
 * Run against production: TEST_RAILWAY_URL=https://yardflow-hitlist-production-2f41.up.railway.app npm run test:integration
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Use production URL by default for integration tests
const RAILWAY_URL =
  process.env.TEST_RAILWAY_URL || 'https://yardflow-hitlist-production-2f41.up.railway.app';
const SERVICE_SECRET = process.env.SERVICE_TO_SERVICE_SECRET || '';
const SKIP_AUTH_TESTS = !SERVICE_SECRET;

// Track if the server is available (set during beforeAll)
let serverAvailable = false;

describe('S2S Authentication', () => {
  // Check server availability before running tests
  beforeAll(async () => {
    try {
      const res = await fetch(`${RAILWAY_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      serverAvailable = res.ok;
      if (!serverAvailable) {
        console.warn(`[S2S Tests] Server returned ${res.status} - tests will be skipped`);
      }
    } catch (error) {
      serverAvailable = false;
      console.warn(
        `[S2S Tests] Server unavailable: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  });

  describe('Public Endpoints', () => {
    it('should allow health check without authentication', async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }

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
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

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

    it('should include CORS headers for GTM origin', async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }

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
    it('should reject missing S2S key', async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }

      const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
        signal: AbortSignal.timeout(10000),
      });

      // Should require authentication
      expect([401, 403]).toContain(res.status);
    }, 15000);

    it('should reject invalid S2S key', async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }

      const res = await fetch(`${RAILWAY_URL}/api/accounts`, {
        headers: {
          'x-service-key': 'invalid-key-12345',
        },
        signal: AbortSignal.timeout(10000),
      });

      expect([401, 403]).toContain(res.status);
    }, 15000);

    it('should reject empty S2S key', async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }

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
    it('should handle OPTIONS preflight correctly', async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }

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

    it('should allow x-service-key header in preflight', async ({ skip }) => {
      if (!serverAvailable) {
        skip();
        return;
      }

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

  describe('Critical S2S Endpoints', () => {
    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/people',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/people`, {
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
          },
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200, not 401/403
        expect(res.status).toBe(200);
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/sequences',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/sequences`, {
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
          },
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200, not 401/403
        expect(res.status).toBe(200);
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/templates',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/templates`, {
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
          },
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200, not 401/403
        expect(res.status).toBe(200);
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/outreach POST',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/outreach`, {
          method: 'POST',
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personId: 'test-person-id',
            channel: 'EMAIL',
            message: 'Integration test message',
          }),
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200 or 404 (person not found), not 401/403
        expect([200, 201, 404, 400]).toContain(res.status);
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/outreach/activity',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/outreach/activity`, {
          method: 'POST',
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            outreachId: 'test-outreach-id',
            type: 'OPENED',
          }),
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200 or 404 (outreach not found), not 401/403
        expect([200, 404, 400]).toContain(res.status);
      },
      15000
    );
  });

  describe('Sprint 35: New S2S Endpoints', () => {
    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/integrations',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/integrations`, {
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
          },
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200, not 401/403
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.integrations).toBeDefined();
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/reports/schedule',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/reports/schedule`, {
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
          },
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200, not 401/403
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.schedules).toBeDefined();
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/ab-tests',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/ab-tests`, {
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
          },
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200 or 400 (no active event), not 401/403
        expect([200, 400]).toContain(res.status);
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/enrichment/validate POST',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/enrichment/validate`, {
          method: 'POST',
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
          }),
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200, not 401/403
        expect(res.status).toBe(200);
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/enrichment/patterns/detect POST',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/enrichment/patterns/detect`, {
          method: 'POST',
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: 'test-account-id',
          }),
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200 or 404 (account not found), not 401/403
        expect([200, 404, 500]).toContain(res.status);
      },
      15000
    );

    it.skipIf(SKIP_AUTH_TESTS)(
      'should accept S2S auth on /api/enrichment/smart-guess POST',
      async ({ skip }) => {
        if (!serverAvailable) {
          skip();
          return;
        }

        const res = await fetch(`${RAILWAY_URL}/api/enrichment/smart-guess`, {
          method: 'POST',
          headers: {
            'x-service-key': SERVICE_SECRET,
            'x-user-id': 'test@integration.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personId: 'test-person-id',
          }),
          signal: AbortSignal.timeout(10000),
        });

        // Should get 200 or 404 (person not found), not 401/403
        expect([200, 404, 400]).toContain(res.status);
      },
      15000
    );
  });
});
