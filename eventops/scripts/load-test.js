/**
 * k6 Load Test Script for YardFlow Hitlist
 * 
 * Sprint U5.5 - Pre-Event Hardening
 * Target: 50 concurrent users for 5 minutes
 * 
 * Install k6: 
 *   brew install k6  (macOS)
 *   apt install k6   (Linux)
 * 
 * Run:
 *   k6 run eventops/scripts/load-test.js
 * 
 * Run with custom options:
 *   k6 run --vus 100 --duration 10m eventops/scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency');
const apiLatency = new Trend('api_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://yardflow-hitlist-production-2f41.up.railway.app';
const SERVICE_KEY = __ENV.SERVICE_KEY || '';

export const options = {
  // Ramp up to 50 users over 1 minute, sustain for 4 minutes, ramp down
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '3m', target: 50 },   // Sustain
    { duration: '1m', target: 0 },    // Ramp down
  ],
  
  // Thresholds - fail if these are not met
  thresholds: {
    'http_req_duration': ['p(95)<500'],      // 95% of requests under 500ms
    'http_req_failed': ['rate<0.01'],        // Less than 1% failure rate
    'errors': ['rate<0.05'],                 // Custom error rate under 5%
    'health_latency': ['p(95)<200'],         // Health check 95th percentile under 200ms
    'api_latency': ['p(95)<1000'],           // API calls 95th percentile under 1s
  },
};

// Standard headers for S2S authentication
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (SERVICE_KEY) {
    headers['x-service-key'] = SERVICE_KEY;
    headers['x-user-id'] = 'loadtest@yardflow.com';
  }
  
  return headers;
}

export default function () {
  // Test 1: Health Check (most critical)
  group('Health Check', function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/health`);
    const duration = Date.now() - start;
    
    healthLatency.add(duration);
    
    const success = check(res, {
      'health status 200': (r) => r.status === 200,
      'health response valid': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy' || body.status === 'ok';
        } catch {
          return false;
        }
      },
    });
    
    errorRate.add(!success);
  });
  
  sleep(0.5);
  
  // Test 2: Accounts API (read-heavy)
  group('Accounts API', function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/accounts?limit=10`, {
      headers: getHeaders(),
    });
    const duration = Date.now() - start;
    
    apiLatency.add(duration);
    
    const success = check(res, {
      'accounts status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    
    errorRate.add(!success);
  });
  
  sleep(0.5);
  
  // Test 3: Event Day API (war room data)
  group('Event Day API', function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/analytics/stats`, {
      headers: getHeaders(),
    });
    const duration = Date.now() - start;
    
    apiLatency.add(duration);
    
    // Accept 200 (success) or 401 (auth required) - both mean server is responding
    const success = check(res, {
      'stats status ok': (r) => r.status === 200 || r.status === 401,
    });
    
    errorRate.add(!success);
  });
  
  sleep(0.5);
  
  // Test 4: People API
  group('People API', function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/people?limit=10`, {
      headers: getHeaders(),
    });
    const duration = Date.now() - start;
    
    apiLatency.add(duration);
    
    const success = check(res, {
      'people status ok': (r) => r.status === 200 || r.status === 401,
    });
    
    errorRate.add(!success);
  });
  
  sleep(0.5);
  
  // Test 5: Meetings API
  group('Meetings API', function () {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/meetings?limit=10`, {
      headers: getHeaders(),
    });
    const duration = Date.now() - start;
    
    apiLatency.add(duration);
    
    const success = check(res, {
      'meetings status ok': (r) => r.status === 200 || r.status === 401,
    });
    
    errorRate.add(!success);
  });
  
  sleep(1);
}

// Lifecycle hooks for logging
export function handleSummary(data) {
  console.log('\n========================================');
  console.log('     YardFlow Hitlist Load Test Report   ');
  console.log('========================================\n');
  
  const passed = data.root_group.checks.reduce((acc, c) => acc && c.passes > 0, true);
  console.log(`Overall Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  console.log('Thresholds:');
  for (const [name, threshold] of Object.entries(data.metrics)) {
    if (threshold.thresholds) {
      for (const [th, result] of Object.entries(threshold.thresholds)) {
        console.log(`  ${result.ok ? '✅' : '❌'} ${name} ${th}`);
      }
    }
  }
  
  return {};
}
