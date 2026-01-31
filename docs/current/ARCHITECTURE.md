# Platform Architecture

YardFlow uses a decoupled architecture where the frontend (GTM) runs on Vercel and the backend (API & Workers) runs on Railway.

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   GTM Frontend      │ │   Content Hub       │ │   Direct Access     │
│   (Vercel)          │ │   (Vercel)          │ │   (Railway)         │
└─────────┬───────────┘ └──────────┬──────────┘ └──────────┬──────────┘
          │                        │                       │ S2S Auth
          │ API Calls              │ Content/Assets        │
          │ (S2S Auth)             │ (Public Read)         │
          ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Railway Backend (eventops)                       │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Next.js    │  │  PostgreSQL │  │   Redis     │  │   BullMQ    │ │
│  │  API Routes │  │  (Prisma)   │  │   (Queues)  │  │   Workers   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. GTM Frontend (Vercel)
- **Role**: Dashboard UI for users.
- **Tech**: Next.js (App Router).
- **Communication**: Calls Railway API via `fetch` with `x-service-key`.

### 2. Railway Backend (Railway)
- **Repo**: `YardFlow-Hitlist`
- **Role**: Headless API, Database, Queues, Workers.
- **Tech**: Next.js (API Routes), Prisma, BullMQ.
- **Services**:
  - **Web**: Serves `/api/*` endpoints.
  - **Worker**: Processes background jobs (agents).

### 3. Content Hub (Vercel)
- **Role**: Host static assets, templates, messaging.
- **URL**: `flow-state-klbt.vercel.app`

## Authentication

We support two auth modes:

1. **Session Auth**: Standard NextAuth session (cookies) for admin usage directly on Railway (legacy/admin).
2. **Service-to-Service (S2S) Auth**: API Key based auth for GTM Frontend.
   - Header `x-service-key`: Must match `SERVICE_TO_SERVICE_SECRET`.
   - Header `x-user-id`: Impersonated User ID.

## Key Decisions

- **Why Split?**: Allows Vercel's superior edge caching for UI and Railway's superior long-running process support for Workers/DB.
- **Why S2S?**: Decouples UI authentication from Backend session management, simplifying the boundary.
