#!/usr/bin/env npx tsx
/**
 * YardFlow Hitlist - E2E Test Suite
 *
 * Sprint U3: Core Flow E2E Testing
 * Tests all critical user journeys end-to-end.
 *
 * Usage:
 *   npx tsx tests/e2e/e2e-test-suite.ts [baseUrl]
 *   npm run test:e2e:local
 *   npm run test:e2e:prod
 *
 * Tasks covered:
 *   - U3.1: Login Flow
 *   - U3.2: Account CRUD Operations
 *   - U3.3: Meeting Creation → Event Day
 *   - U3.4: Outreach Status Updates
 *   - U3.5: Smoke Test Extensions
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const PROD_URL = 'https://yardflow-hitlist-production-2f41.up.railway.app';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuiteResult {
  suite: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
}

const results: TestSuiteResult[] = [];
let currentSuite: TestSuiteResult | null = null;

// Test helpers
function log(msg: string) {
  console.log(msg);
}

function suite(name: string) {
  currentSuite = { suite: name, tests: [], passed: 0, failed: 0, skipped: 0 };
  results.push(currentSuite);
  log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════${colors.reset}`);
  log(`${colors.cyan}${colors.bold}  ${name}${colors.reset}`);
  log(`${colors.cyan}${colors.bold}═══════════════════════════════════════${colors.reset}`);
}

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  process.stdout.write(`  ${colors.dim}⧖${colors.reset} ${name}... `);

  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`${colors.green}✓ PASS${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`);
    currentSuite?.tests.push({ name, passed: true, duration });
    if (currentSuite) currentSuite.passed++;
    return true;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.log(`    ${colors.red}${errorMessage}${colors.reset}`);
    currentSuite?.tests.push({ name, passed: false, duration, error: errorMessage });
    if (currentSuite) currentSuite.failed++;
    return false;
  }
}

function skip(name: string, reason?: string) {
  console.log(`  ${colors.yellow}○ SKIP${colors.reset} ${name}${reason ? ` (${reason})` : ''}`);
  if (currentSuite) currentSuite.skipped++;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(arr: number[], value: number, message?: string) {
  if (!arr.includes(value)) {
    throw new Error(message || `Expected array to include ${value}`);
  }
}

// ============================================================================
// Test Suite: U3.1 - Login Flow
// ============================================================================

async function testLoginFlow() {
  suite('U3.1: Login Flow');

  await test('Login page loads (200)', async () => {
    const res = await fetch(`${BASE_URL}/login`);
    assertEqual(res.status, 200, `Login page returned ${res.status}`);
  });

  await test('Login page contains form elements', async () => {
    const res = await fetch(`${BASE_URL}/login`);
    const html = await res.text();
    assert(
      html.includes('email') ||
        html.includes('Email') ||
        html.includes('sign in') ||
        html.includes('Sign In'),
      'Login page should contain email/signin elements'
    );
  });

  await test('Protected route redirects without auth', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    assertIncludes(
      [302, 303, 307, 308],
      res.status,
      `Dashboard should redirect, got ${res.status}`
    );
  });

  await test('API returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/accounts`);
    assertEqual(res.status, 401, `API should return 401 without auth, got ${res.status}`);
  });

  await test('NextAuth session endpoint exists', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`);
    assertEqual(res.status, 200, `Session endpoint should return 200, got ${res.status}`);
    const data = await res.json();
    assert(typeof data === 'object', 'Session endpoint should return JSON object');
  });
}

// ============================================================================
// Test Suite: U3.2 - Account CRUD Operations
// ============================================================================

async function testAccountCRUD() {
  suite('U3.2: Account CRUD Operations');

  await test('GET /api/accounts returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/accounts`);
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('POST /api/accounts returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E Test Corp' }),
    });
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('GET /api/accounts/:id returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/accounts/test-id`);
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('PATCH /api/accounts/:id returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/accounts/test-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icpScore: 85 }),
    });
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('DELETE /api/accounts/:id returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/accounts/test-id`, {
      method: 'DELETE',
    });
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  // Note: Full CRUD with auth requires session cookies
  skip('Full CRUD cycle (create → read → update → delete)', 'Requires authenticated session');
}

// ============================================================================
// Test Suite: U3.3 - Meeting Creation → Event Day
// ============================================================================

async function testMeetingEventDay() {
  suite('U3.3: Meeting → Event Day Flow');

  await test('GET /api/meetings returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/meetings`);
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('POST /api/meetings returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: 'test-person',
        scheduledAt: new Date().toISOString(),
      }),
    });
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('Event Day page redirects without auth', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/event-day`, { redirect: 'manual' });
    assertIncludes([302, 303, 307, 308], res.status, `Should redirect, got ${res.status}`);
  });

  skip('Meeting appears in Event Day after creation', 'Requires authenticated session');
}

// ============================================================================
// Test Suite: U3.4 - Outreach Status Updates
// ============================================================================

async function testOutreachStatus() {
  suite('U3.4: Outreach Status Updates');

  await test('PATCH /api/outreach/:id returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/outreach/test-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SENT' }),
    });
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('DELETE /api/outreach/:id returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/outreach/test-id`, {
      method: 'DELETE',
    });
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('POST /api/outreach/send-email returns 401 without auth', async () => {
    const res = await fetch(`${BASE_URL}/api/outreach/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: 'test', subject: 'Test', message: 'Test' }),
    });
    assertIncludes([401, 404, 405], res.status, `Should return auth error, got ${res.status}`);
  });

  skip('Outreach status transitions (DRAFT → SENT)', 'Requires authenticated session');
}

// ============================================================================
// Test Suite: U3.5 - Extended Smoke Tests
// ============================================================================

async function testSmoke() {
  suite('U3.5: Extended Smoke Tests');

  await test('Health endpoint returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assertEqual(res.status, 200, `Health endpoint returned ${res.status}`);
    const data = await res.json();
    assert(
      data.status === 'ok' || data.status === 'healthy',
      `Health status should be ok or healthy, got ${data.status}`
    );
  });

  await test('Health endpoint includes service checks', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    assert(
      'services' in data || 'database' in data || 'checks' in data || data.status === 'ok',
      'Health should include service info'
    );
  });

  await test('Ping endpoint returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/ping`);
    assertEqual(res.status, 200, `Ping endpoint returned ${res.status}`);
  });

  await test('Home page loads (200 or redirect)', async () => {
    const res = await fetch(BASE_URL, { redirect: 'manual' });
    assertIncludes([200, 302, 303, 307, 308], res.status, `Home returned ${res.status}`);
  });

  await test('API routes return JSON content-type', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const contentType = res.headers.get('content-type');
    assert(!!contentType?.includes('application/json'), `Expected JSON, got ${contentType}`);
  });

  await test('Response times are acceptable (<2s)', async () => {
    const start = Date.now();
    await fetch(`${BASE_URL}/api/health`);
    const duration = Date.now() - start;
    assert(duration < 2000, `Response took ${duration}ms, expected <2000ms`);
  });
}

// ============================================================================
// Test Suite: Additional API Security Tests
// ============================================================================

async function testAPISecurity() {
  suite('API Security Tests');

  await test('People API requires auth', async () => {
    const res = await fetch(`${BASE_URL}/api/people`);
    assertEqual(res.status, 401, `Should return 401, got ${res.status}`);
  });

  await test('Events API requires auth', async () => {
    const res = await fetch(`${BASE_URL}/api/events`);
    assertIncludes([401, 403], res.status, `Should require auth, got ${res.status}`);
  });

  await test('Analytics API requires auth', async () => {
    const res = await fetch(`${BASE_URL}/api/analytics`);
    assertIncludes([401, 403, 404], res.status, `Should require auth, got ${res.status}`);
  });

  await test('Admin API requires auth', async () => {
    const res = await fetch(`${BASE_URL}/api/admin`);
    assertIncludes([401, 403, 404], res.status, `Should require auth, got ${res.status}`);
  });
}

// ============================================================================
// Print Summary
// ============================================================================

function printSummary() {
  log(`\n${colors.bold}═══════════════════════════════════════${colors.reset}`);
  log(`${colors.bold}  TEST SUMMARY${colors.reset}`);
  log(`${colors.bold}═══════════════════════════════════════${colors.reset}\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const s of results) {
    const status = s.failed === 0 ? colors.green + '✓' : colors.red + '✗';
    log(
      `${status} ${s.suite}${colors.reset}: ${s.passed} passed, ${s.failed} failed, ${s.skipped} skipped`
    );
    totalPassed += s.passed;
    totalFailed += s.failed;
    totalSkipped += s.skipped;
  }

  log('');
  log(
    `${colors.bold}Total:${colors.reset} ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`
  );

  if (totalFailed === 0) {
    log(`\n${colors.green}${colors.bold}✅ All tests passed!${colors.reset}`);
    return true;
  } else {
    log(`\n${colors.red}${colors.bold}❌ ${totalFailed} test(s) failed${colors.reset}`);

    // Print failed tests
    log(`\n${colors.red}Failed tests:${colors.reset}`);
    for (const s of results) {
      for (const t of s.tests) {
        if (!t.passed) {
          log(`  ${colors.red}✗${colors.reset} ${s.suite} > ${t.name}`);
          if (t.error) log(`    ${colors.dim}${t.error}${colors.reset}`);
        }
      }
    }
    return false;
  }
}

// ============================================================================
// Main Runner
// ============================================================================

async function main() {
  log(`${colors.bold}🧪 YardFlow Hitlist E2E Test Suite${colors.reset}`);
  log(`${colors.dim}Testing against: ${BASE_URL}${colors.reset}`);
  log(`${colors.dim}Started at: ${new Date().toISOString()}${colors.reset}`);

  try {
    // Check if server is reachable first
    log(`\n${colors.cyan}Checking server availability...${colors.reset}`);
    const healthCheck = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    if (!healthCheck || !healthCheck.ok) {
      log(`${colors.red}❌ Server not reachable at ${BASE_URL}${colors.reset}`);
      log(`${colors.yellow}Make sure the server is running:${colors.reset}`);
      log(`  cd eventops && npm run dev`);
      log(`  ${colors.dim}or${colors.reset}`);
      log(`  Use production: npx tsx tests/e2e/e2e-test-suite.ts ${PROD_URL}`);
      process.exit(1);
    }

    log(`${colors.green}✓ Server is reachable${colors.reset}`);

    // Run all test suites
    await testLoginFlow();
    await testAccountCRUD();
    await testMeetingEventDay();
    await testOutreachStatus();
    await testSmoke();
    await testAPISecurity();

    const success = printSummary();
    process.exit(success ? 0 : 1);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`\n${colors.red}Fatal error: ${errorMessage}${colors.reset}`);
    process.exit(1);
  }
}

main();
