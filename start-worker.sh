#!/bin/sh
# Railway worker startup script
# This bypasses any Railway start command caching issues

set -e

echo "Starting YardFlow worker..."
echo "Node version: $(node --version)"
echo "Working directory: $(pwd)"
echo "Directory contents:"
ls -la

# Execute the worker using absolute paths
exec node eventops/node_modules/tsx/dist/cli.mjs eventops/src/lib/queue/workers.ts
