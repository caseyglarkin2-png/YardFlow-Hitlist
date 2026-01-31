/**
 * k6 Load Test Script for YardFlow Hitlist
 * 
 * Run with: k6 run tests/load/k6-load-test.js
 * 
 * Prerequisites:
 * - Install k6: brew install k6 (macOS) or apt install k6 (Linux)
 * - Set environment variables:
 *   - BASE_URL: Target server URL
 *   - SERVICE_KEY: S2S authentication key (optional)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency');
const apiLatency = new Trend('api_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Peak at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failure rate
    errors: ['rate<0.05'],             // Less than 5% custom errors
    health_latency: ['p(99)<200'],     // Health check under 200ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://yardflow-hitlist-production-2f41.up.railway.app';
const SERVICE_KEY = __ENV.SERVICE_KEY || '';

const headers = SERVICE_KEY 
  ? { 'x-service-key': SERVICE_KEY, 'Content-Type': 'application/json' }
  : { 'Content-Type': 'application/json' };

export default function () {
  group('Health Check', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/health`);
    healthLatency.add(Date.now() - start);
    
    const success = check(res, {
      'health status 200': (r) => r.status === 200,
      'health body contains status': (r) => r.body.includes('healthy'),
    });
    
    errorRate.add(!success);
  });

  sleep(0.5);

  group('API Endpoints', () => {
    // Test accounts endpoint (requires auth, expect 401 without)
    const start = Date.now();
    const accountsRes = http.get(`${BASE_URL}/api/accounts`, { headers });
    apiLatency.add(Date.now() - start);
    
    const accountsSuccess = check(accountsRes, {
      'accounts returns 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    
    errorRate.add(!accountsSuccess);
  });

  sleep(0.5);

  group('Analytics Endpoints', () => {
    // Funnel analytics (requires auth)
    const funnelRes = http.get(`${BASE_URL}/api/analytics/funnel`, { headers });
    
    check(funnelRes, {
      'funnel returns 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(1);

  group('Agent Status', () => {
    const agentRes = http.get(`${BASE_URL}/api/agents/status`, { headers });
    
    check(agentRes, {
      'agent status returns 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, opts) {
  const { metrics } = data;
  const lines = [
    '',
    '='.repeat(60),
    'YardFlow Hitlist Load Test Summary',
    '='.repeat(60),
    '',
    `Total Requests:     ${metrics.http_reqs?.values?.count || 0}`,
    `Failed Requests:    ${metrics.http_req_failed?.values?.passes || 0}`,
    `Avg Duration:       ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`,
    `P95 Duration:       ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms`,
    `P99 Duration:       ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms`,
    `Health Check P99:   ${(metrics.health_latency?.values?.['p(99)'] || 0).toFixed(2)}ms`,
    '',
    'Thresholds:',
    `  http_req_duration p(95)<500ms: ${metrics.http_req_duration?.values?.['p(95)'] < 500 ? '✓ PASS' : '✗ FAIL'}`,
    `  http_req_failed rate<1%: ${(metrics.http_req_failed?.values?.rate || 0) < 0.01 ? '✓ PASS' : '✗ FAIL'}`,
    `  health_latency p(99)<200ms: ${(metrics.health_latency?.values?.['p(99)'] || 0) < 200 ? '✓ PASS' : '✗ FAIL'}`,
    '',
    '='.repeat(60),
  ];
  
  return lines.join('\n');
}
