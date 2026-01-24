# YardFlow Hitlist

**Event-Driven Account-Based Marketing Platform**

YardFlow Hitlist is a production ABM platform for targeting high-value accounts at industry events, featuring AI-powered enrichment, multi-channel outreach sequences, and Google Calendar integration.

## 🚀 Quick Start

```bash
# Install dependencies
cd eventops && npm install

# Setup database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

Visit `http://localhost:3000`

## 📋 Current Status

**Production**: https://yardflow-hitlist-production.up.railway.app  
**Platform**: Railway (Auto-deploy from main branch)  
**Database**: PostgreSQL on Railway  
**Cache**: Redis on Railway  
**Current Sprint**: Sprin4, 2026)
- ✅ **Sprint 31 COMPLETE**: Manifest 2026 integration (meeting requests, ROI, strategic questions)
- ✅ **Sprint 32.1-32.2**: Agent infrastructure (state management, content hub caching)
- ✅ Railway deployment: Live and stable
- ✅ Removed Render deployment (Railway-only strategy)crashes (type guards)
- ✅ Enhanced health endpoint (/api/health)
- 🔄 Deploying to production

## 📚 Documentation

### Current Documentation
- [Sprint 30 Production Hardening](docs/current/SPRINT_30_PRODUCTION_HARDENING.md) - **PRIMARY REFERENCE**
- [Sprint 30 Quick Reference](docs/current/SPRINT_30_QUICK_REFERENCE.md)
- [Project Principles](docs/current/PROJECT_PRINCIPLES.md)

### Archive
Historical documentation organized by category:
- [Sprint Archives](docs/archive/sprints/) - Completed sprint documentation
- [Deployment History](docs/archive/deployments/) - Deployment guides and logs
- [Status Reports](docs/archive/status-reports/) - Historical status updates
- [Planning Docs](docs/archive/plans/) - Feature plans and analyses

## 🏗️ Architecture

**Stack**:
- **Frontend**: Next.js 14.2 (App Router, Server Components)
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: Redis + BullMQ
- **Auth**: NextAuth v5 (credentials + Google OAuth)
- **Email**: SendGrid
- **Calendar**: Google Calendar API
- **Deployment**: Railway

**Key Features**:
- 🎯 Target account management with ICP scoring
- 👤 Contact enrichment (email patterns, LinkedIn)
- 📧 Multi-step email sequences
- 📅 Google Calendar meeting integration
- 🔄 Background job processing
- 📊 Real-time analytics dashboard

## 🗂️ Project Structure

```
YardFlow-Hitlist/
├── eventops/                 # Main Next.js application
│   ├── src/
│   │   ├── app/             # Next.js 14 App Router
│   │   │   ├── api/         # API routes
│   │   │   ├── dashboard/   # Dashboard pages
│   │   │   └── auth/        # Authentication
│   │   ├── lib/             # Core libraries
│   │   │   ├── queue/       # BullMQ job queues
│   │   │   ├── outreach/    # Sequence engine
│   │   │   ├── enrichment/  # Data enrichment
│   │   │   └── integrations/# External APIs
│   │   └── components/      # React components
│   ├── prisma/              # Database schema & migrations
│   └── public/              # Static assets
├── docs/
│   ├── current/             # Current documentation
│   └── archive/             # Historical documentation
└── README.md                # This file (single source of truth)
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (optional for local dev)

### Environment Variables
Create `.env.local` in `eventops/`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/yardflow"

# Auth
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# SendGrid Email
SENDGRID_API_KEY="..."
SENDGRID_FROM_EMAIL="..."

# Redis (optional for local)
REDIS_URL="redis://localhost:6379"
```

### Common Commands

```bash
# Database
npm run db:migrate        # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server

# Workers
npm run worker           # Start background job worker

# Testing
npm run test             # Run tests
npm run lint             # Lint code
```

## 🚢 Deployment

**Railway Deployment** (Production):
```bash
# Push to main branch triggers auto-deploy
git push origin main

# Monitor deployment
railway logs

# Check health
curl https://yardflow-hitlist-production.up.railway.app/api/health
```

**Health Checks**: `/api/health` monitors:
- ✅ Database connectivity
- ✅ Auth system
- ✅ Environment variables
- ✅ Redis (if configured)

## 🔐 Environment

**Required**:
- `DATABASE_URL` - PostgreSQL connection
- `AUTH_SECRET` - NextAuth encryption key

**Optional**:
- `REDIS_URL` - Job queue (gracefully degrades)
- `GOOGLE_CLIENT_ID/SECRET` - OAuth + Calendar
- `SENDGRID_API_KEY` - Email sending
- `ANTHROPIC_API_KEY` - AI enrichment

## 📊 API Endpoints

### Health & Monitoring
- `GET /api/health` - System health check

### Queue Management
- `POST /api/queue/enrich` - Trigger enrichment job
- `GET /api/queue/stats` - Queue statistics
- `GET /api/queue/status/:jobId` - Job status

### Sequences
- `POST /api/sequences` - Create sequence
- `POST /api/sequences/:id/enroll` - Enroll contact

### Google Integration
- `GET /api/google/auth` - OAuth initiation
- `GET /api/google/meetings` - Fetch meetings
- `POST /api/google/meetings/create` - Schedule meeting

## 🎯 Sprint 30 Goals

**P0 (Critical)**:
1. ✅ Fix Redis build hang
2. ✅ Fix dashboard session crashes
3. ✅ Add comprehensive health monitoring
4. 🔄 Create seed data for testing
5. ⏳ Deploy worker service
6. ⏳ Configure production monitoring

**P1 (High Priority)**:
- Database seed script with sample data
- Worker deployment on Railway
- End-to-end testing
- Error tracking setup

See [SPRINT_30_PRODUCTION_HARDENING.md](docs/current/SPRINT_30_PRODUCTION_HARDENING.md) for full details.

## 🤝 Contributing

This is a production application. Follow these principles:

1. **Ship small, ship often, ship fearlessly**
2. Make atomic, testable changes
3. Write meaningful commit messages
4. Test locally before pushing
5. Monitor health endpoint after deploy

## 📝 License

Proprietary - Internal Use Only

## 🆘 Support

**Production Issues**:
1. Check health endpoint: `/api/health`
2. Review Railway logs: `railway logs`
3. Check database: `npx prisma studio`
4. Verify Redis: `redis-cli ping` (if applicable)

**Common Issues**:
- **Build fails locally**: Redis not required for build (Railway has it)
- **Session errors**: Check AUTH_SECRET is set
- **Email not sending**: Verify SENDGRID_API_KEY
- **Jobs not processing**: Ensure worker service is running

---

**Last Updated**: January 23, 2026  
**Maintainer**: Casey Glarkin  
**Status**: Production Active ✅
