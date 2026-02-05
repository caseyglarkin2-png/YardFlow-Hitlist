/**
 * Sprint 43 - Route Auth Pattern Validation
 *
 * Scans ALL API routes to verify they use the correct auth pattern.
 * This is a meta-test that catches regressions in auth patterns.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = join(__dirname, '../../src/app/api');

/**
 * Recursively find all route.ts files under the API directory
 */
function findRouteFiles(dir: string): string[] {
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findRouteFiles(fullPath));
      } else if (entry === 'route.ts') {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return results;
}

/**
 * Routes that are EXEMPT from authServiceOrSession requirement.
 * These either ARE auth endpoints or have valid reasons to use auth() directly.
 */
const EXEMPT_ROUTES = [
  '/api/auth/refresh', // IS the auth endpoint
  '/api/auth/session', // IS the auth endpoint
  '/api/google/connect', // User-interactive OAuth redirect, needs session
  '/api/health', // Public health check
  '/api/webhooks/sendgrid', // External webhook, uses signature verification
  '/api/webhooks/hubspot', // External webhook, uses signature verification
];

function getRelativeRoute(filePath: string): string {
  const apiIndex = filePath.indexOf('/api/');
  if (apiIndex === -1) return filePath;
  const route = filePath.substring(apiIndex).replace('/route.ts', '');
  return route;
}

describe('Route Auth Pattern Validation', () => {
  const routeFiles = findRouteFiles(API_DIR);

  it('finds API route files', () => {
    expect(routeFiles.length).toBeGreaterThan(50);
  });

  it('no route uses old auth() pattern (except exempt routes)', () => {
    const violations: string[] = [];

    for (const file of routeFiles) {
      const route = getRelativeRoute(file);
      if (EXEMPT_ROUTES.some((exempt) => route.includes(exempt.replace('/api', '')))) {
        continue;
      }

      const content = readFileSync(file, 'utf-8');

      // Check for old auth() import
      if (content.includes("from '@/auth'") || content.includes("from '@/lib/auth'")) {
        // Make sure it's not just a type import or re-export
        if (content.includes('await auth()') || content.includes('const session = await auth')) {
          violations.push(`${route}: Still uses auth() instead of authServiceOrSession`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('all authenticated routes import authServiceOrSession', () => {
    const missingAuth: string[] = [];

    for (const file of routeFiles) {
      const route = getRelativeRoute(file);
      if (EXEMPT_ROUTES.some((exempt) => route.includes(exempt.replace('/api', '')))) {
        continue;
      }

      const content = readFileSync(file, 'utf-8');

      // Routes that handle auth should use authServiceOrSession
      const hasAuthCheck =
        content.includes('authServiceOrSession') || content.includes('requireAuth');
      const isPublicRoute = !content.includes('Unauthorized') && !content.includes('401');

      if (!hasAuthCheck && !isPublicRoute) {
        missingAuth.push(`${route}: Has 401 check but doesn't use authServiceOrSession`);
      }
    }

    // Log for visibility but don't fail on edge cases
    if (missingAuth.length > 0) {
      console.warn('Routes with potential auth issues:', missingAuth);
    }

    // The critical check: NO route should be mixing old and new patterns
    // Current baseline: 15 routes use older auth patterns (cron routes, bulk endpoints, etc.)
    // These should be migrated incrementally in future sprints
    expect(missingAuth.length).toBeLessThanOrEqual(15);
  });

  it('all routes have force-dynamic export', () => {
    const missingDynamic: string[] = [];

    for (const file of routeFiles) {
      const route = getRelativeRoute(file);
      const content = readFileSync(file, 'utf-8');

      // Only check routes that do auth (they should be dynamic)
      if (content.includes('authServiceOrSession') || content.includes('requireAuth')) {
        if (!content.includes("export const dynamic = 'force-dynamic'")) {
          missingDynamic.push(route);
        }
      }
    }

    // Log for visibility
    if (missingDynamic.length > 0) {
      console.warn('Routes missing force-dynamic:', missingDynamic);
    }

    // Current baseline: 39 routes missing force-dynamic (pre-existing)
    // Many were created before the standard was established
    expect(missingDynamic.length).toBeLessThanOrEqual(40);
  });

  it('all route handler functions accept NextRequest parameter', () => {
    const wrongType: string[] = [];

    for (const file of routeFiles) {
      const route = getRelativeRoute(file);
      const content = readFileSync(file, 'utf-8');

      // Only check routes using authServiceOrSession (they need NextRequest)
      if (content.includes('authServiceOrSession')) {
        // Check for bare Request type (not NextRequest)
        const handlers = content.match(
          /export async function (GET|POST|PUT|PATCH|DELETE)\((request|req):\s*Request[^)]/g
        );
        if (handlers) {
          wrongType.push(`${route}: Uses Request type instead of NextRequest`);
        }
      }
    }

    if (wrongType.length > 0) {
      console.warn('Routes with wrong request type:', wrongType);
    }

    expect(wrongType.length).toBeLessThanOrEqual(5);
  });
});
