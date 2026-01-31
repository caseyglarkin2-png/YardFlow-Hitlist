# EventOps (YardFlow Hitlist)

Event execution platform for managing accounts, people, outreach, and day-of operations.
Runs on **Railway** as a headless backend service.

## Architecture

- **Backend**: Next.js App Router (Railway)
  - API Routes only (Headless)
  - Worker Service (BullMQ consumers)
- **Frontend**: YardFlow GTM (Vercel)
- **Auth**: Service-to-Service (S2S) via `x-service-key` + NextAuth Session

## Getting Started

### Prerequisites

- Node.js 20+
- Railway CLI (optional)
- PostgreSQL (Local or Railway)
- Redis (Local or Railway)

### Local Development

1. **Install dependencies:**

```bash
cd eventops
npm install
```

2. **Setup environment variables:**

```bash
cp .env.example .env
# Required: DATABASE_URL, REDIS_URL, SERVICE_TO_SERVICE_SECRET
```

3. **Setup database:**

```bash
# Push schema to DB
npx prisma db push
npx prisma generate
```

4. **Run development server:**

```bash
npm run dev
```

## Deployment for Railway

This project is configured for split-service deployment on Railway:

1. **Web Service**: Runs `start-production.sh` (Next.js Standalone)
2. **Worker Service**: Runs `start-worker.sh` (BullMQ workers)

Do not deploy to Vercel (Frontend is separate).

## Service-to-Service Auth

Calls from GTM Frontend (Vercel) to this backend require headers:

- `x-service-key`: Matches `SERVICE_TO_SERVICE_SECRET` env var
- `x-user-id`: User ID acting on behalf of
- `x-user-email`: Optional user email

## Agents

AI Agents utilize `content-hub` for assets and contracts.
Queues are managed via Redis/BullMQ.

6. **Start development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Test Accounts

After seeding:
- **Admin:** casey@eventops.com / password
- **Member:** jake@eventops.com / password

## Deployment (Vercel)

1. **Push to GitHub:**

```bash
git init
git add .
git commit -m "Initial commit - Sprint 0"
git branch -M main
git remote add origin https://github.com/yourusername/eventops.git
git push -u origin main
```

2. **Connect to Vercel:**

- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variables from `.env.example`
- Deploy!

3. **Setup Vercel Postgres:**

- In Vercel project dashboard, go to Storage tab
- Create new Postgres database
- Vercel will automatically add environment variables
- Redeploy to apply changes

4. **Run migrations on Vercel:**

```bash
vercel env pull .env.local
npx prisma migrate deploy
npx prisma db seed
```

## Project Structure

```
eventops/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── lib/             # Utilities, services, validations
│   └── types/           # TypeScript types
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
├── tests/
│   ├── e2e/             # Playwright tests
│   └── unit/            # Vitest tests
└── public/              # Static files
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL (Vercel Postgres)
- **ORM:** Prisma
- **Auth:** NextAuth v5
- **Validation:** Zod
- **Testing:** Vitest + Playwright

## Sprint Progress

- ✅ Sprint 0: Foundation & Authentication (In Progress)
- ⏳ Sprint 1: Events + Accounts + People CRUD
- ⏳ Sprint 2: CSV Ingestion + Deduplication
- ⏳ Sprint 3: Scoring Engine
- ⏳ Sprint 4: Research & Evidence
- ⏳ Sprint 5: Outreach Templates & Drafts
- ⏳ Sprint 6: Connect Reports
- ⏳ Sprint 7: Execution Mode
- ⏳ Sprint 8: AI Enrichment (Optional)

## Documentation

- [Sprint Plan](../EVENTOPS_SPRINT_PLAN.md) - Detailed sprint breakdown
- [Project Plan](../PROJECT_PLAN.md) - Original comprehensive plan

## License

Private - Internal use only
