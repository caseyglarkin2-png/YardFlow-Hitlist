#!/bin/bash

# EventOps Local Setup Script

echo "🚀 EventOps Local Setup"
echo "======================="
echo ""

# Check if Docker is running (for local Postgres)
if command -v docker &> /dev/null; then
    echo "✓ Docker found"
    
    read -p "Use local Docker Postgres? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Starting Postgres..."
        docker compose up -d
        
        # Wait for database
        echo "⏳ Waiting for database..."
        sleep 5
        
        # Update .env for local Postgres
        cat > .env << EOF
POSTGRES_PRISMA_URL="postgresql://eventops:eventops@localhost:5432/eventops"
POSTGRES_URL_NON_POOLING="postgresql://eventops:eventops@localhost:5432/eventops"
AUTH_SECRET="local-dev-secret-key-change-in-production-min-32-chars"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
ENABLE_AUTO_ENRICHMENT="false"
NODE_ENV="development"
EOF
        echo "✓ .env configured for local Postgres"
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️  Running migrations..."
npx prisma migrate dev --name init

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Open http://localhost:3000"
echo "  3. Login with:"
echo "     - Admin: casey@eventops.com / password"
echo "     - Member: jake@eventops.com / password"
echo ""
echo "📚 Documentation:"
echo "  - README.md - Project overview"
echo "  - DEPLOYMENT.md - Vercel deployment guide"
echo "  - EVENTOPS_SPRINT_PLAN.md - Development roadmap"
