#!/bin/sh
# Render worker startup script

set -e

echo "Starting YardFlow worker..."
echo "Node version: $(node --version)"
echo "Working directory: $(pwd)"

# Docker WORKDIR is already /app - execute worker directly
exec /app/eventops/node_modules/.bin/tsx /app/eventops/src/lib/queue/workers.ts
