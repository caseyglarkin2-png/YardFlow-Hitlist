
try {
  process.env.DATABASE_URL = undefined;
  // Clear require cache
  delete require.cache[require.resolve('./src/lib/prisma')];
  require('./src/lib/prisma');
  console.log('Success: Imported prisma.ts without env vars');
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  console.error('Crash: ' + message);
  process.exit(1);
}
