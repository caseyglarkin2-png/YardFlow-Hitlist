#!/bin/sh
set -e

# Default to JSON logging for observability
log_info() {
  echo "{\"level\":\"info\",\"msg\":\"$1\",\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}"
}

log_error() {
  echo "{\"level\":\"error\",\"msg\":\"$1\",\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}"
}

log_info "Starting production initialization..."

# 1. Run Migrations (but don't crash if they fail)
log_info "Attempting Prisma migrations..."
set +e # Disable exit-on-error temporarily for migrations
if npx prisma migrate deploy; then
  log_info "Prisma migrations applied successfully."
else
  log_error "Prisma migrations failed! Proceeding to start server for observability (Health Check will report DB error)."
  # We do NOT exit here. We want the app to start so we can see 503s instead of 502s.
fi
set -e # Re-enable exit-on-error

# 2. Start Application
# Ensure we bind to all interfaces for Docker/Railway
export HOST=0.0.0.0
export PORT=${PORT:-3000}

log_info "Starting Next.js standalone server on $HOST:$PORT"

# Check if standalone server exists
if [ ! -f ".next/standalone/server.js" ]; then
  log_error "Standalone server not found at .next/standalone/server.js! Did the build fail?"
  exit 1
fi

# exec replaces the shell with the node process (good for signal propagation/Docker)
exec node .next/standalone/server.js
