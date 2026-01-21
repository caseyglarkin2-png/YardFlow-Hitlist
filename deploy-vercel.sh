#!/bin/bash

# YardFlow EventOps - Vercel Deployment Script
# This script deploys the EventOps Next.js application to Vercel

set -e

echo "🚀 Deploying YardFlow EventOps to Vercel..."
echo ""
echo "Project: yard-flow-hitlist"
echo "URL: https://yard-flow-hitlist.vercel.app"
echo "Root Directory: eventops/"
echo ""

# Check if we're in the right directory
if [ ! -d "eventops" ]; then
    echo "❌ Error: Must run from /workspaces/YardFlow-Hitlist"
    exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Determine deployment type
if [ "$1" == "prod" ] || [ "$1" == "production" ] || [ "$1" == "--prod" ]; then
    echo "🌐 Deploying to PRODUCTION..."
    vercel --prod
elif [ "$1" == "preview" ] || [ "$1" == "" ]; then
    echo "🔍 Deploying PREVIEW..."
    vercel
else
    echo "❌ Invalid argument. Use: ./deploy-vercel.sh [prod|preview]"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 View deployment: https://vercel.com/caseys-projects-2a50de81/yard-flow-hitlist"
