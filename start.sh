#!/bin/bash
set -e

# Copy built files from eventops if needed
cd /app/eventops

# Run Prisma migrations
npx prisma migrate deploy

# Start the application
npm start
