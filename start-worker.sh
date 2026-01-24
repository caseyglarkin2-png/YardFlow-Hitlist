#!/bin/sh
# Render worker startup script

set -e

echo "Starting YardFlow worker..."
echo "Node version: $(node --version)"
echo "Working directory: $(pwd)"

# Change to eventops directory and use npx to find tsx
cd /app/eventops
exec npx tsx src/lib/queue/workers.ts
