import { config } from 'dotenv';
config();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  const BASE_URL = process.env.RAILWAY_URL || 'http://localhost:3000';
  const SECRET = process.env.SERVICE_TO_SERVICE_SECRET;
  
  if (!SECRET) {
      console.error('Missing SERVICE_TO_SERVICE_SECRET. Please set it in .env or pass it.');
      // For local testing we might assume localhost if not set, but the endpoint requires auth.
      // If we are running inside the container and env vars are loaded, it should be fine.
      if (process.env.NODE_ENV === 'production') process.exit(1);
  }

  console.log(`Target: ${BASE_URL}`);

  // 1. Trigger
  console.log('1. Triggering Graphics Agent via S2S...');
  
  const triggerRes = await fetch(`${BASE_URL}/api/agents/trigger`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-service-key': SECRET || 'mock-secret', // Fallback for local dev without strict auth
        'x-user-id': 'service:test-integration',
        'x-user-email': 'test@example.com' // passing email to help user resolution if needed
    },
    body: JSON.stringify({
        action: 'run-graphics',
        params: {
            type: 'social-post',
            theme: 'Integrity Test',
            content: { headline: 'Automated Test' }
        }
    })
  });

  if (!triggerRes.ok) {
      console.error('Trigger failed:', triggerRes.status, await triggerRes.text());
  } else {
      const triggerData = await triggerRes.json();
      console.log('Trigger success:', triggerData);
  }

  // 2. Monitor Status
  console.log('2. Monitoring Status...');
  
  const statusRes = await fetch(`${BASE_URL}/api/agents/monitor?timeRange=1h`, {
      method: "GET",
      headers: {
        'x-service-key': SECRET || 'mock-secret',
        'x-user-id': 'service:test-integration'
      }
  });

  if (!statusRes.ok) {
     console.error('Status check failed:', statusRes.status, await statusRes.text());
  } else {
     const statusData = await statusRes.json();
     console.log('Status data received (preview):', JSON.stringify(statusData).substring(0, 100) + '...');
  }
}

runTest();
