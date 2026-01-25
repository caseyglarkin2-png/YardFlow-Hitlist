const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'REDIS_URL',
  'GEMINI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SENDGRID_API_KEY',
  'CRON_SECRET',
];

function checkEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`- ${key}`));
    process.exit(1);
  }

  console.log('✅ All required environment variables are set.');
}

checkEnv();
