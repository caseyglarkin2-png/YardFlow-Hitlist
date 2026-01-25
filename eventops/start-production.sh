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
log_info "Current Directory (PWD): $(pwd)"

# Debug: Show directory structure depth 2 to identify build artifacts
# Useful to debug if 'standalone' folder was actually created
if [ -d ".next" ]; then
  log_info "Listing .next directory structure (truncated)..."
  find .next -maxdepth 3 -not -path '*/.*' | head -n 20
else
  log_error "Directory .next does NOT exist. Build likely failed."
fi

# 1. Run Migrations (but don't crash if they fail)
log_info "Attempting Prisma migrations..."
set +e # Disable exit-on-error temporarily for migrations
if npx prisma migrate deploy; then
  log_info "Prisma migrations applied successfully."
else
  log_error "Prisma migrations failed! This might happen if another instance is migrating or connection failed. Proceeding to start server for observability."
fi
set -e # Re-enable exit-on-error

# 2. Start Application
# Ensure we bind to all interfaces for Docker/Railway
# Railway requires 0.0.0.0 to accept external traffic
export HOST=0.0.0.0
export HOSTNAME="0.0.0.0" 
export PORT=${PORT:-3000}

# FIX: Layout drift / CSS 404s
# Next.js 'standalone' output does NOT include static assets (CSS, Images, chunks).
# We must copy/link them into the standalone directory for them to be served.
log_info "Preparing static assets for standalone server..."
mkdir -p .next/standalone/.next
mkdir -p .next/standalone/public

# Copy .next/static -> .next/standalone/.next/static
if [ -d ".next/static" ]; then
    log_info "Linking .next/static..."
    # Remove if exists to prevent stale links
    rm -rf .next/standalone/.next/static
    # Copy is safer than symlink for some container filesystems
    cp -R .next/static .next/standalone/.next/static
else
    log_error "WARNING: .next/static not found! styling will be broken."
fi

# Copy public -> .next/standalone/public
if [ -d "public" ]; then
    log_info "Linking public/ directory..."
    # Remove if exists
    rm -rf .next/standalone/public
    cp -R public .next/standalone/
else
    log_info "No public/ directory found."
fi

log_info "Starting Next.js standalone server on $HOSTNAME:$PORT"

# Check if standalone server exists
if [ ! -f ".next/standalone/server.js" ]; then
  log_error "FATAL: Standalone server not found at .next/standalone/server.js!"
  log_error "Did the build fail? Ensure 'output: standalone' is in next.config.js"
  log_error "Directory contents of .next:"
  ls -la .next
  exit 1
fi

# Verify node_modules exists in standalone (critical for dependencies)
if [ ! -d ".next/standalone/node_modules" ]; then
    log_error "WARNING: node_modules not found in .next/standalone. This may cause runtime errors if dependencies are missing."
else
    log_info "Verified node_modules exists in standalone build."
fi

log_info "BINDING TO PORT: $PORT"

# Navigate to standalone directory to ensure correct module resolution
cd .next/standalone

if [ ! -d "node_modules" ]; then
    log_info "node_modules missing in standalone. Linking from root..."
    ln -s ../../node_modules ./node_modules
fi

# exec replaces the shell with the node process (good for signal propagation/Docker)
exec node server.js
