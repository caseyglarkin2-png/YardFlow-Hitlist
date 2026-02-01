/**
 * k6 Load Test Script for YardFlow Hitlist - Manifest 2026 Preparation
 *
 * Task U5.5: Pre-Event Hardening
 * Target: 50 concurrent users strictly browsing "Manifest 2026" dashboards.
 *
 * Scenarios:
 * 1. Browse Manifest Dashboard
 * 2. Scan Meetings List
 * 3. View Person Details
 *
 * Usage:
 *   k6 run scripts/load-test.js
 *   BASE_URL=http://localhost:3000 k6 run scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { parseHTML } from 'k6/html';

// Metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://yardflow-hitlist-production-2f41.up.railway.app';
// Optional: If you have a session cookie from your browser, set it here to test authenticated flows
// export COOKIE='next-auth.session-token=...'
const SESSION_COOKIE = __ENV.COOKIE || '';

export const options = {
  stages: [
    // Ramp up to 50 users over 1 minute
    { duration: '1m', target: 50 },
    // Sustain 50 users for 3 minutes
    { duration: '3m', target: 50 },
    // Ramp down to 0
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    errors: ['rate<0.10'], // Error rate < 10% (allowing some auth redirects)
  },
};

const headers = {
  'User-Agent': 'k6-load-test/1.0',
};

if (SESSION_COOKIE) {
  headers['Cookie'] = SESSION_COOKIE;
}

export default function loadTest() {
  // 1. Visit Manifest Dashboard
  group('Manifest Dashboard', function () {
    const res = http.get(`${BASE_URL}/dashboard/manifest`, { headers });

    responseTime.add(res.timings.duration);

    // We accept 200 (OK) or 307/308 (Redirect to Login) or 401 (Unauthorized API)
    // This confirms the server is handling the request load, even if auth fails.
    const success = check(res, {
      'status is 200 or redirect': (r) => [200, 307, 308, 401, 302].includes(r.status),
    });
    errorRate.add(!success);
  });

  sleep(1);

  // 2. Scan Meetings List (Page + API)
  group('Meetings Scan', function () {
    // Page load
    const pageRes = http.get(`${BASE_URL}/dashboard/meetings`, { headers });
    check(pageRes, {
      'page status OK': (r) => [200, 307, 308, 401, 302].includes(r.status),
    });

    // API Call (Simulate data fetching)
    // Note: This API likely requires auth. Expect 401 if no cookie.
    const apiRes = http.get(`${BASE_URL}/api/meetings?limit=20`, { headers });
    check(apiRes, {
      'api status OK': (r) => [200, 401].includes(r.status),
    });
  });

  sleep(2);

  // 3. View Person Details
  group('Person Details', function () {
    // First, hit the people list to find a link
    const listRes = http.get(`${BASE_URL}/dashboard/people`, { headers });

    let personLink = null;
    if (listRes.status === 200) {
      // Try to parse HTML for a person link
      const doc = parseHTML(listRes.body);
      // Look for links that contain '/dashboard/people/' followed by an ID
      const link = doc.find("a[href^='/dashboard/people/']");
      if (link.size() > 0) {
        personLink = link.attr('href');
      }
    }

    // Fallback if scraping failed
    if (!personLink) {
      // Construct a hypothetical one or just verify the list loaded
      // We'll hit the list endpoint again as a proxy if we can't find a detail page
      // or try a known ID if we had one.
      // For now, we'll just log that we stayed on the list.
    } else {
      // Visit the Person Detail Page
      // personLink is relative, e.g. "/dashboard/people/cm6n..."
      const detailRes = http.get(`${BASE_URL}${personLink}`, { headers });
      responseTime.add(detailRes.timings.duration);
      check(detailRes, {
        'detail page status OK': (r) => [200, 307, 308, 302].includes(r.status),
      });
    }
  });

  sleep(2);
}
