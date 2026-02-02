#!/bin/sh
set -e

echo '{"level":"info","msg":"Running Prisma migrations...","timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"}'

# Run migrations using local prisma binary
# Use ./node_modules/.bin/prisma directly since npx may not be reliable in standalone mode
if ./node_modules/.bin/prisma migrate deploy 2>&1; then
  echo '{"level":"info","msg":"Prisma migrations applied successfully","timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"}'
else
  echo '{"level":"warn","msg":"Prisma migrations failed or already applied - proceeding anyway","timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"}'
fi

echo '{"level":"info","msg":"Starting Next.js standalone server...","timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"}'

# Start the server
exec node server.js
