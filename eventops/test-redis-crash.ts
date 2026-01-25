
try {
  process.env.REDIS_URL = 'invalid-url-format';
  require('./src/lib/queue/client');
  console.log('Success: Imported queue/client.ts');
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  console.error('Crash detected in queue/client.ts: ' + message);
  process.exit(1);
}
