
try {
  process.env.DATABASE_URL = undefined;
  // Clear require cache for db.ts if it was loaded
  // But we are running a fresh process
  require('./src/lib/db');
  console.log('Success: Imported db.ts without env vars');
} catch (e) {
  console.error('Crash: ' + e.message);
  process.exit(1);
}
