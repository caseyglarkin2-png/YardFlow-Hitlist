# EventOps - Atomic Sprint & Task Breakdown

**Last Updated:** January 20, 2026  
**Status:** Ready for Implementation

---

## Executive Summary

This document provides an exhaustive, atomic breakdown of tasks for building EventOps - an internal event execution platform starting with Manifest 2026. Every task is committable, testable, and builds toward demonstrable sprint goals.

**Key Improvements from Architect Review:**
- ✅ Fixed naming collision (Company → TargetAccount)
- ✅ Incremental Prisma schema evolution (not big-bang)
- ✅ Added critical infrastructure tasks (error handling, logging, monitoring)
- ✅ Split large tasks into atomic units
- ✅ Made async operations properly async (background jobs)
- ✅ Removed premature abstractions (storage layer, feature flags DB)
- ✅ Fixed execution board to person-level (not account-level)
- ✅ Added missing cross-cutting concerns (migrations, deployment, performance)

---

## Sprint 0: Foundation & Authentication (4-5 days)

**Sprint Goal:** Working authenticated app with error handling, logging, and basic navigation.

**Demo Checkpoint:** User can log in, see empty dashboard, navigate between pages, errors are handled gracefully.

---

### Ticket 0.1: Initialize Next.js + Tailwind + shadcn/ui

**Description:**  
Manually create Next.js 14 project structure with TypeScript, Tailwind CSS, App Router, and src directory. Initialize shadcn/ui component library.

**Files Created:**
- `eventops/package.json`
- `eventops/tsconfig.json`
- `eventops/next.config.mjs`
- `eventops/tailwind.config.ts`
- `eventops/postcss.config.mjs`
- `eventops/components.json`
- `eventops/src/app/layout.tsx`
- `eventops/src/app/page.tsx`
- `eventops/src/app/globals.css`
- `eventops/src/lib/utils.ts`

**Dependencies:**
```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.3.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

**Validation:**
```bash
npm install
npm run lint
npm run build
npm run dev  # Starts on localhost:3000
```

**Acceptance Criteria:**
- [ ] `npm run dev` starts without errors
- [ ] Page renders at localhost:3000
- [ ] Tailwind classes apply correctly
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes with no errors

**Tests:** N/A (infrastructure setup)

---

### Ticket 0.2: Environment & Configuration Management

**Description:**  
Setup environment variable management with validation, .env.example template, and .gitignore configuration.

**Files Created:**
- `eventops/.env.example`
- `eventops/.gitignore` (update)
- `eventops/src/lib/env.ts` (Zod validation)

**Dependencies:**
```bash
npm install zod
```

**Implementation:**

`.env.example`:
```bash
# Database
DATABASE_URL="postgresql://eventops:eventops@localhost:5432/eventops?schema=public"

# Auth (NextAuth v5)
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Feature Flags (ENV-based)
ENABLE_AUTO_ENRICHMENT="false"

# Optional: External APIs (Sprint 8)
SERPAPI_KEY=""
OPENAI_API_KEY=""
```

`src/lib/env.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  ENABLE_AUTO_ENRICHMENT: z.enum(['true', 'false']).default('false'),
  SERPAPI_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
```

**Validation:**
```bash
cp .env.example .env
# Edit .env with real values
npm run build  # Should fail if env vars invalid
```

**Acceptance Criteria:**
- [ ] `.env.example` contains all required variables
- [ ] `.env` in `.gitignore`
- [ ] App crashes on startup with helpful message if env vars invalid
- [ ] Zod validation catches missing/malformed env vars

**Tests:**
```typescript
// tests/unit/env.test.ts
describe('env validation', () => {
  it('should require DATABASE_URL', () => {
    expect(() => envSchema.parse({})).toThrow();
  });
  
  it('should validate AUTH_SECRET length', () => {
    expect(() => envSchema.parse({ AUTH_SECRET: 'short' })).toThrow();
  });
});
```

---

### Ticket 0.3: Docker Compose + Postgres

**Description:**  
Setup local Postgres database with Docker Compose, health checks, and persistent volumes.

**Files Created:**
- `eventops/docker-compose.yml`
- `eventops/.dockerignore`
- `eventops/README.md` (update with local dev instructions)

**Implementation:**

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: eventops-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: eventops
      POSTGRES_PASSWORD: eventops
      POSTGRES_DB: eventops
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eventops"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

**Validation:**
```bash
docker compose up -d postgres
docker compose ps  # Should show healthy
docker exec -it eventops-db psql -U eventops -c '\l'  # List databases
docker compose down  # Cleanup
```

**Acceptance Criteria:**
- [ ] `docker compose up -d` starts Postgres
- [ ] Database accessible on localhost:5432
- [ ] Health check passes
- [ ] Data persists across restarts
- [ ] Can connect with psql or GUI client

**Tests:** N/A (infrastructure)

---

### Ticket 0.4: Prisma Setup + Minimal Schema

**Description:**  
Initialize Prisma ORM with minimal schema (User, Event, TargetAccount, Person only). Add logging configuration. Create Prisma Client singleton.

**Files Created:**
- `eventops/prisma/schema.prisma`
- `eventops/src/lib/db.ts` (Prisma client)
- `eventops/src/lib/logger.ts` (structured logging)

**Dependencies:**
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

**Implementation:**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MEMBER
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String?   // hashed with bcrypt
  image         String?
  role          Role      @default(MEMBER)
  activeEventId String?   // Current working event
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  activeEvent   Event?    @relation("ActiveEvent", fields: [activeEventId], references: [id])
  
  @@map("users")
}

enum EventStatus {
  PLANNING
  ACTIVE
  COMPLETED
  CANCELLED
}

model Event {
  id          String      @id @default(cuid())
  name        String
  location    String?
  startDate   DateTime
  endDate     DateTime
  status      EventStatus @default(PLANNING)
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  accounts    TargetAccount[]
  activeUsers User[]      @relation("ActiveEvent")

  @@map("events")
}

model TargetAccount {
  id             String   @id @default(cuid())
  eventId        String
  companyName    String
  website        String?
  industry       String?
  notes          String?
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  event          Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  people         Person[]

  @@index([eventId])
  @@map("target_accounts")
}

model Person {
  id          String   @id @default(cuid())
  accountId   String
  name        String
  title       String?
  email       String?
  linkedinUrl String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  account     TargetAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([accountId])
  @@map("people")
}
```

`src/lib/db.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

`src/lib/logger.ts`:
```typescript
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };
    
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();
```

**Validation:**
```bash
docker compose up -d postgres
npx prisma validate
npx prisma migrate dev --name init
npx prisma generate
```

**Acceptance Criteria:**
- [ ] `prisma validate` succeeds
- [ ] Migration creates all tables
- [ ] Prisma Client generates successfully
- [ ] Can import `db` from `@/lib/db`
- [ ] Logger outputs structured JSON
- [ ] No naming collision between models

**Tests:**
```typescript
// tests/integration/db.test.ts
import { db } from '@/lib/db';

describe('Database connection', () => {
  it('should connect to database', async () => {
    await expect(db.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  it('should create user', async () => {
    const user = await db.user.create({
      data: { email: 'test@test.com', name: 'Test User' }
    });
    expect(user.id).toBeDefined();
    await db.user.delete({ where: { id: user.id } });
  });
});
```

---

### Ticket 0.5: Error Handling Middleware + API Patterns

**Description:**  
Create error handling utilities, API response wrappers, and standardized error responses for API routes.

**Files Created:**
- `eventops/src/lib/errors.ts`
- `eventops/src/lib/api-response.ts`
- `eventops/src/app/error.tsx` (global error boundary)
- `eventops/src/app/not-found.tsx`

**Dependencies:**
```bash
# Already have zod
```

**Implementation:**

`src/lib/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
```

`src/lib/api-response.ts`:
```typescript
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logger } from './logger';

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code?: string; details?: unknown } };

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  );
}

export function errorResponse(error: unknown) {
  // Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error', { errors: error.errors });
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      },
      { status: 400 }
    );
  }

  // Application errors
  if (error instanceof AppError) {
    logger.warn('Application error', { 
      message: error.message, 
      code: error.code,
      statusCode: error.statusCode 
    });
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown };
    logger.error('Database error', { code: prismaError.code, meta: prismaError.meta });
    
    if (prismaError.code === 'P2002') {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { message: 'Resource already exists', code: 'DUPLICATE' },
        },
        { status: 409 }
      );
    }
  }

  // Unknown errors
  logger.error('Unexpected error', { error });
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    },
    { status: 500 }
  );
}

// API route wrapper with error handling
export function apiHandler<T>(
  handler: () => Promise<T>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler()
    .then((data) => successResponse(data))
    .catch((error) => errorResponse(error));
}
```

`src/app/error.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Client error boundary', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="mt-2 text-gray-600">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

`src/app/not-found.tsx`:
```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
        <p className="mt-2 text-gray-600">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

**Validation:**
```bash
# Create test API route
# Test error scenarios manually
curl localhost:3000/api/test-error
```

**Acceptance Criteria:**
- [ ] API errors return consistent JSON structure
- [ ] Zod validation errors formatted correctly
- [ ] Prisma errors mapped to HTTP status codes
- [ ] Unknown errors return 500 with safe message
- [ ] Error boundary catches client errors
- [ ] 404 page renders
- [ ] All errors logged with context

**Tests:**
```typescript
// tests/unit/api-response.test.ts
import { errorResponse } from '@/lib/api-response';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { ZodError } from 'zod';

describe('API error handling', () => {
  it('should format AppError correctly', async () => {
    const response = errorResponse(new NotFoundError('Account'));
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('should format Zod errors', async () => {
    const zodError = new ZodError([]);
    const response = errorResponse(zodError);
    expect(response.status).toBe(400);
  });
});
```

---

### Ticket 0.6a: NextAuth Setup + Credentials Provider

**Description:**  
Install and configure NextAuth v5 (Auth.js) with email/password authentication using Prisma adapter. Setup session management and login page.

**Files Created:**
- `eventops/src/lib/auth.ts` (NextAuth config)
- `eventops/src/app/api/auth/[...nextauth]/route.ts`
- `eventops/src/app/(auth)/login/page.tsx`
- `eventops/src/app/(auth)/layout.tsx`

**Dependencies:**
```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

**Implementation:**

`src/lib/auth.ts`:
```typescript
import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from './db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password } = validated.data;
        const user = await db.user.findUnique({ where: { email } });
        
        if (!user || !user.password) return null;
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'ADMIN' | 'MEMBER';
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

`src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

`src/app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

`src/app/(auth)/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-8 shadow-md">
      <h1 className="mb-6 text-2xl font-bold">EventOps Login</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
```

**Validation:**
```bash
# Create test user in database
npx prisma studio
# Or via seed script
```

**Acceptance Criteria:**
- [ ] Login page renders at `/login`
- [ ] Can submit credentials
- [ ] Successful login redirects to `/`
- [ ] Invalid credentials show error
- [ ] Session persists across page refreshes
- [ ] JWT includes user ID and role

**Tests:**
```typescript
// tests/e2e/auth.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('EventOps Login');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });
});
```

---

### Ticket 0.6b: RBAC Middleware + Protected Routes

**Description:**  
Implement role-based access control with middleware to protect dashboard routes and provide authorization utilities.

**Files Created:**
- `eventops/src/middleware.ts`
- `eventops/src/lib/rbac.ts`
- `eventops/src/lib/auth-utils.ts`

**Implementation:**

`src/middleware.ts`:
```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');

  // Allow auth API routes
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated and not on auth page
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to dashboard if logged in and on auth page
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

`src/lib/rbac.ts`:
```typescript
import { Role } from '@prisma/client';

export type Permission =
  | 'event:create'
  | 'event:edit'
  | 'event:delete'
  | 'account:create'
  | 'account:edit'
  | 'account:delete'
  | 'user:manage'
  | 'scoring:configure'
  | 'draft:approve';

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    'event:create',
    'event:edit',
    'event:delete',
    'account:create',
    'account:edit',
    'account:delete',
    'user:manage',
    'scoring:configure',
    'draft:approve',
  ],
  MEMBER: [
    'account:create',
    'account:edit',
    'draft:approve',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function requirePermission(role: Role | undefined, permission: Permission) {
  if (!role || !hasPermission(role, permission)) {
    throw new Error(`Forbidden: Missing permission ${permission}`);
  }
}
```

`src/lib/auth-utils.ts`:
```typescript
import { auth } from '@/lib/auth';
import { UnauthorizedError, ForbiddenError } from './errors';
import { Permission, hasPermission } from './rbac';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError();
  }
  return user;
}
```

**Validation:**
```bash
# Test protected routes manually
# Logout, try to access /
# Should redirect to /login
```

**Acceptance Criteria:**
- [ ] Unauthenticated users redirected to `/login`
- [ ] Authenticated users can access dashboard
- [ ] Authenticated users redirected from `/login` to `/`
- [ ] `requireAuth()` throws on unauthenticated API calls
- [ ] `requirePermission()` throws for insufficient permissions
- [ ] ADMIN has all permissions
- [ ] MEMBER has limited permissions

**Tests:**
```typescript
// tests/unit/rbac.test.ts
import { hasPermission } from '@/lib/rbac';
import { Role } from '@prisma/client';

describe('RBAC', () => {
  it('should grant ADMIN all permissions', () => {
    expect(hasPermission(Role.ADMIN, 'user:manage')).toBe(true);
    expect(hasPermission(Role.ADMIN, 'event:delete')).toBe(true);
  });

  it('should limit MEMBER permissions', () => {
    expect(hasPermission(Role.MEMBER, 'user:manage')).toBe(false);
    expect(hasPermission(Role.MEMBER, 'account:edit')).toBe(true);
  });
});

// tests/e2e/protected-routes.spec.ts
test('should protect dashboard routes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
});
```

---

### Ticket 0.7: Dashboard Layout + Navigation Shell

**Description:**  
Create main dashboard layout with sidebar navigation, header with user menu, and placeholder pages for each section.

**Files Created:**
- `eventops/src/app/(dashboard)/layout.tsx`
- `eventops/src/components/layout/sidebar.tsx`
- `eventops/src/components/layout/header.tsx`
- `eventops/src/app/(dashboard)/page.tsx` (dashboard home)
- `eventops/src/app/(dashboard)/events/page.tsx` (placeholder)
- `eventops/src/app/(dashboard)/accounts/page.tsx` (placeholder)
- `eventops/src/app/(dashboard)/people/page.tsx` (placeholder)
- `eventops/src/app/(dashboard)/outreach/page.tsx` (placeholder)
- `eventops/src/app/(dashboard)/execution/page.tsx` (placeholder)

**Dependencies:**
```bash
npm install lucide-react  # Icons
npx shadcn-ui@latest add button dropdown-menu avatar
```

**Implementation:**

`src/app/(dashboard)/layout.tsx`:
```typescript
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

`src/components/layout/sidebar.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Building2, Users, Mail, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Accounts', href: '/accounts', icon: Building2 },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Outreach', href: '/outreach', icon: Mail },
  { name: 'Execution', href: '/execution', icon: CheckSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">EventOps</h1>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
                          (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

`src/components/layout/header.tsx`:
```typescript
import { auth, signOut } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        {/* Breadcrumbs or page title can go here */}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar>
              <AvatarFallback>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}>
              <button type="submit" className="w-full text-left">
                Logout
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

`src/app/(dashboard)/page.tsx`:
```typescript
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}</h1>
      <p className="mt-2 text-gray-600">
        Your personalized dashboard will appear here.
      </p>
    </div>
  );
}
```

**Validation:**
- Manual smoke test checklist

**Acceptance Criteria:**
- [ ] Login redirects to dashboard
- [ ] Sidebar shows all navigation items
- [ ] Active route highlighted in sidebar
- [ ] All placeholder pages render
- [ ] User menu shows name, email, role
- [ ] Logout button works
- [ ] Mobile-responsive (sidebar collapses)

**Tests:**
```typescript
// tests/e2e/navigation.spec.ts
test('should navigate between pages', async ({ page, context }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Test navigation
  await page.click('text=Events');
  await expect(page).toHaveURL('/events');
  
  await page.click('text=Accounts');
  await expect(page).toHaveURL('/accounts');
  
  // Test logout
  await page.click('button:has-text("U")');  // Avatar
  await page.click('text=Logout');
  await expect(page).toHaveURL('/login');
});
```

---

### Ticket 0.8: Testing Infrastructure + Seed Data

**Description:**  
Setup Playwright for E2E testing, Vitest for unit/integration tests. Create seed script with test users and sample data.

**Files Created:**
- `eventops/playwright.config.ts`
- `eventops/vitest.config.ts`
- `eventops/prisma/seed.ts`
- `eventops/tests/setup.ts`
- `eventops/tests/e2e/example.spec.ts`
- `eventops/tests/unit/example.test.ts`

**Dependencies:**
```bash
npm install -D @playwright/test vitest @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/jest-dom
npx playwright install
```

**Implementation:**

`playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

`prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('password', 10);

  const casey = await db.user.upsert({
    where: { email: 'casey@eventops.com' },
    update: {},
    create: {
      email: 'casey@eventops.com',
      name: 'Casey',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const jake = await db.user.upsert({
    where: { email: 'jake@eventops.com' },
    update: {},
    create: {
      email: 'jake@eventops.com',
      name: 'Jake',
      password: hashedPassword,
      role: 'MEMBER',
    },
  });

  // Create events
  const manifest2026 = await db.event.upsert({
    where: { id: 'manifest-2026' },
    update: {},
    create: {
      id: 'manifest-2026',
      name: 'Manifest 2026',
      location: 'Las Vegas, NV',
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-02-12'),
      status: 'ACTIVE',
    },
  });

  // Create sample accounts
  await db.targetAccount.create({
    data: {
      eventId: manifest2026.id,
      companyName: 'GXO',
      website: 'https://gxo.com',
      industry: 'Logistics',
      people: {
        create: [
          {
            name: 'Jamie Saucedo',
            title: 'Vice President, Business Operations',
          },
          {
            name: 'Kim Kyle',
            title: 'Senior Vice President, Operations',
          },
        ],
      },
    },
  });

  console.log('Seeding completed!');
  console.log('Test accounts:');
  console.log('  casey@eventops.com / password (ADMIN)');
  console.log('  jake@eventops.com / password (MEMBER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
```

Update `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:unit": "vitest run"
  }
}
```

**Validation:**
```bash
npx prisma db seed
npm run test:unit
npm run test:e2e
```

**Acceptance Criteria:**
- [ ] Seed script creates users and sample data
- [ ] Vitest runs unit tests
- [ ] Playwright runs E2E tests
- [ ] Test users can login
- [ ] CI-ready configuration

**Tests:** This IS the testing setup

---

## Sprint 0 Complete! 🎉

**Demo Checklist:**
- [ ] Start app: `docker compose up -d && npm run dev`
- [ ] Login as casey@eventops.com / password
- [ ] Navigate through all pages
- [ ] Logout works
- [ ] Error pages render
- [ ] Tests pass: `npm run test`

---

## Sprint 1: Events + Accounts + People CRUD (4-5 days)

**Sprint Goal:** Create events, add companies with people, basic filtering and search.

**Demo Checkpoint:** Can create Manifest 2026 event, add 10 companies with attendees, filter by industry.

---

### Ticket 1.1: Event CRUD + Active Event Selection

**Description:**  
Build event management with create/edit/list functionality. Add active event selector stored in user profile.

**Files Created:**
- `eventops/src/app/(dashboard)/events/page.tsx`
- `eventops/src/app/(dashboard)/events/new/page.tsx`
- `eventops/src/app/(dashboard)/events/[id]/page.tsx`
- `eventops/src/app/(dashboard)/events/[id]/edit/page.tsx`
- `eventops/src/components/events/event-form.tsx`
- `eventops/src/components/events/event-list.tsx`
- `eventops/src/components/events/active-event-selector.tsx`
- `eventops/src/app/api/events/route.ts`
- `eventops/src/app/api/events/[id]/route.ts`
- `eventops/src/app/api/users/me/active-event/route.ts`
- `eventops/src/lib/validations/event.ts`

**Schema Changes:** None (already in Sprint 0)

**Dependencies:**
```bash
npx shadcn-ui@latest add form input label select calendar popover
npm install react-hook-form @hookform/resolvers date-fns
```

**Implementation Highlights:**

`src/lib/validations/event.ts`:
```typescript
import { z } from 'zod';

export const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  location: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type EventFormData = z.infer<typeof eventSchema>;
```

`src/app/api/events/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { eventSchema } from '@/lib/validations/event';
import { apiHandler } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    await requireAuth();
    
    const events = await db.event.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });
    
    return events;
  });
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    await requireAuth();
    
    const body = await request.json();
    const validated = eventSchema.parse(body);
    
    const event = await db.event.create({
      data: validated,
    });
    
    return event;
  });
}
```

`src/app/api/users/me/active-event/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';

const activeEventSchema = z.object({
  eventId: z.string().cuid().nullable(),
});

export async function PUT(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();
    const { eventId } = activeEventSchema.parse(body);
    
    const updated = await db.user.update({
      where: { id: user.id },
      data: { activeEventId: eventId },
    });
    
    return updated;
  });
}
```

**Acceptance Criteria:**
- [ ] Events list page shows all events
- [ ] Can create new event
- [ ] Can edit existing event
- [ ] Can set active event (persists across sessions)
- [ ] Active event highlighted in list
- [ ] Form validation works
- [ ] Date range validated

**Tests:**
```typescript
// tests/e2e/events.spec.ts
test('should create event', async ({ page }) => {
  await login(page);
  await page.goto('/events');
  await page.click('text=New Event');
  await page.fill('input[name="name"]', 'Test Event 2027');
  await page.fill('input[name="location"]', 'San Francisco');
  // Fill dates...
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Test Event 2027')).toBeVisible();
});

// tests/integration/events-api.test.ts
describe('Events API', () => {
  it('should create event', async () => {
    const response = await fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      }),
    });
    expect(response.ok).toBe(true);
  });
});
```

---

### Ticket 1.2: TargetAccount CRUD (Basic)

**Description:**  
Build account management scoped to active event. Create/edit/view/delete companies with basic fields only (no scoring yet).

**Files Created:**
- `eventops/src/app/(dashboard)/accounts/page.tsx`
- `eventops/src/app/(dashboard)/accounts/new/page.tsx`
- `eventops/src/app/(dashboard)/accounts/[id]/page.tsx`
- `eventops/src/app/(dashboard)/accounts/[id]/edit/page.tsx`
- `eventops/src/components/accounts/account-form.tsx`
- `eventops/src/components/accounts/account-list.tsx`
- `eventops/src/components/accounts/account-card.tsx`
- `eventops/src/app/api/accounts/route.ts`
- `eventops/src/app/api/accounts/[id]/route.ts`
- `eventops/src/lib/validations/account.ts`

**Implementation:**

`src/lib/validations/account.ts`:
```typescript
import { z } from 'zod';

export const accountSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  notes: z.string().optional(),
});

export type AccountFormData = z.infer<typeof accountSchema>;
```

`src/app/api/accounts/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { accountSchema } from '@/lib/validations/account';
import { apiHandler } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-utils';
import { NotFoundError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireAuth();
    
    // Get active event from user
    const userWithEvent = await db.user.findUnique({
      where: { id: user.id },
      select: { activeEventId: true },
    });
    
    if (!userWithEvent?.activeEventId) {
      throw new NotFoundError('Active event');
    }
    
    const accounts = await db.targetAccount.findMany({
      where: { eventId: userWithEvent.activeEventId },
      include: {
        _count: { select: { people: true } },
      },
      orderBy: { companyName: 'asc' },
    });
    
    return accounts;
  });
}

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();
    const validated = accountSchema.parse(body);
    
    const userWithEvent = await db.user.findUnique({
      where: { id: user.id },
      select: { activeEventId: true },
    });
    
    if (!userWithEvent?.activeEventId) {
      throw new NotFoundError('Active event');
    }
    
    const account = await db.targetAccount.create({
      data: {
        ...validated,
        eventId: userWithEvent.activeEventId,
      },
    });
    
    return account;
  });
}
```

**Acceptance Criteria:**
- [ ] Accounts list shows companies for active event
- [ ] Can create account
- [ ] Can edit account
- [ ] Can delete account
- [ ] Shows people count per account
- [ ] Validates company name required
- [ ] URL validation works

**Tests:**
```typescript
test('should create account', async ({ page }) => {
  await login(page);
  await setActiveEvent(page, 'Manifest 2026');
  await page.goto('/accounts');
  await page.click('text=New Account');
  await page.fill('input[name="companyName"]', 'Test Corp');
  await page.fill('input[name="website"]', 'https://testcorp.com');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Test Corp')).toBeVisible();
});
```

---

### Ticket 1.3: Person CRUD + Persona Tags

**Description:**  
Add people to accounts with persona tag support. Display people on account detail page.

**Files Created:**
- `eventops/src/app/(dashboard)/accounts/[id]/people/page.tsx`
- `eventops/src/components/people/person-form.tsx`
- `eventops/src/components/people/person-list.tsx`
- `eventops/src/components/people/persona-badge.tsx`
- `eventops/src/app/api/people/route.ts`
- `eventops/src/app/api/people/[id]/route.ts`
- `eventops/src/lib/validations/person.ts`
- `eventops/src/lib/constants.ts` (persona definitions)

**Schema Migration:**
```prisma
// Add to Person model
model Person {
  // ... existing fields
  
  // Persona flags
  isExecOps   Boolean  @default(false)
  isOps       Boolean  @default(false)
  isProc      Boolean  @default(false)
  isSales     Boolean  @default(false)
  isTech      Boolean  @default(false)
  isNonOps    Boolean  @default(false)
}
```

**Implementation:**

`src/lib/constants.ts`:
```typescript
export const PERSONA_TYPES = {
  EXEC_OPS: { label: 'Exec Ops', color: 'purple', weight: 10 },
  OPS: { label: 'Operations', color: 'blue', weight: 5 },
  PROC: { label: 'Procurement', color: 'green', weight: 3 },
  SALES: { label: 'Sales', color: 'orange', weight: 1 },
  TECH: { label: 'Tech', color: 'cyan', weight: 1 },
  NON_OPS: { label: 'Non-Ops', color: 'gray', weight: 0 },
} as const;
```

`src/lib/validations/person.ts`:
```typescript
import { z } from 'zod';

export const personSchema = z.object({
  accountId: z.string().cuid(),
  name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  isExecOps: z.boolean().default(false),
  isOps: z.boolean().default(false),
  isProc: z.boolean().default(false),
  isSales: z.boolean().default(false),
  isTech: z.boolean().default(false),
  isNonOps: z.boolean().default(false),
});

export type PersonFormData = z.infer<typeof personSchema>;
```

**Acceptance Criteria:**
- [ ] Can add people to account
- [ ] Can edit person details
- [ ] Can delete person
- [ ] Persona tags selectable (multiple allowed)
- [ ] People list shows name, title, persona badges
- [ ] Account detail shows people count

**Tests:**
```typescript
test('should add person with persona tags', async ({ page }) => {
  await createAccount(page, 'Test Corp');
  await page.click('text=Add Person');
  await page.fill('input[name="name"]', 'John Doe');
  await page.fill('input[name="title"]', 'VP Operations');
  await page.check('input[name="isExecOps"]');
  await page.check('input[name="isOps"]');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=John Doe')).toBeVisible();
  await expect(page.locator('text=Exec Ops')).toBeVisible();
});
```

---

### Ticket 1.4: Filtering + Sorting + Pagination

**Description:**  
Add filter bar to accounts list with server-side filtering, sorting, and pagination. Persist filters in URL.

**Files Created:**
- `eventops/src/components/accounts/account-filters.tsx`
- `eventops/src/lib/utils/query-params.ts`
- `eventops/src/lib/utils/pagination.ts`

**Dependencies:**
```bash
npx shadcn-ui@latest add pagination
```

**Implementation:**

Update `src/app/api/accounts/route.ts`:
```typescript
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const industry = searchParams.get('industry') || '';
    const sortBy = searchParams.get('sortBy') || 'companyName';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    const userWithEvent = await db.user.findUnique({
      where: { id: user.id },
      select: { activeEventId: true },
    });
    
    if (!userWithEvent?.activeEventId) {
      throw new NotFoundError('Active event');
    }
    
    const where: any = { eventId: userWithEvent.activeEventId };
    
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (industry) {
      where.industry = industry;
    }
    
    const [accounts, total] = await Promise.all([
      db.targetAccount.findMany({
        where,
        include: {
          _count: { select: { people: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.targetAccount.count({ where }),
    ]);
    
    return {
      data: accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}
```

**Acceptance Criteria:**
- [ ] Filter by search term
- [ ] Filter by industry
- [ ] Sort by company name, created date
- [ ] Pagination works
- [ ] Filters persist in URL
- [ ] "Clear filters" button
- [ ] Shows result count

**Tests:**
```typescript
test('should filter accounts', async ({ page }) => {
  await page.goto('/accounts?search=GXO');
  await expect(page.locator('text=GXO')).toBeVisible();
  await expect(page).toHaveURL(/search=GXO/);
});

test('should paginate results', async ({ page }) => {
  await page.goto('/accounts');
  await page.click('text=Next');
  await expect(page).toHaveURL(/page=2/);
});
```

---

### Ticket 1.5: Form Patterns + Validation Library

**Description:**  
Create reusable form components and patterns using react-hook-form + Zod. Setup consistent error handling.

**Files Created:**
- `eventops/src/components/ui/form-field.tsx`
- `eventops/src/components/ui/form-error.tsx`
- `eventops/src/lib/hooks/use-form-with-validation.ts`
- `eventops/src/lib/hooks/use-api.ts` (for mutations)

**Dependencies:** Already installed

**Implementation:**

`src/lib/hooks/use-api.ts`:
```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '../logger';

interface UseApiOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useApi<TData, TVariables = void>(
  apiFn: (variables: TVariables) => Promise<TData>,
  options?: UseApiOptions
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const execute = async (variables: TVariables) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFn(variables);
      options?.onSuccess?.();
      router.refresh();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      logger.error('API call failed', { error: err });
      options?.onError?.(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}
```

**Acceptance Criteria:**
- [ ] All forms use react-hook-form
- [ ] Zod validation integrated
- [ ] Consistent error display
- [ ] Loading states on submit
- [ ] Success feedback (toast or redirect)

**Tests:**
```typescript
// tests/unit/use-api.test.ts
import { renderHook, act } from '@testing-library/react';
import { useApi } from '@/lib/hooks/use-api';

describe('useApi hook', () => {
  it('should handle successful API call', async () => {
    const mockFn = vi.fn().mockResolvedValue({ id: '1' });
    const { result } = renderHook(() => useApi(mockFn));

    await act(async () => {
      await result.current.execute(undefined);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
```

---

## Sprint 1 Complete! 🎉

**Demo Checklist:**
- [ ] Create Manifest 2026 event
- [ ] Set as active event
- [ ] Add 10 companies
- [ ] Add people to each company with persona tags
- [ ] Filter by industry
- [ ] Search for company
- [ ] Sort by name
- [ ] Pagination works

---

## Sprint 2: CSV Ingestion + Deduplication (5-6 days)

**Sprint Goal:** Upload CSV of companies/people, map columns, deduplicate, import successfully.

**Demo Checkpoint:** Upload real Manifest CSV with 500 companies, resolve 50 duplicates, import all data.

---

### Ticket 2.0: Schema Migration - Add Deduplication Fields

**Description:**  
Add fields to TargetAccount model to support deduplication and fuzzy matching.

**Schema Changes:**
```prisma
model TargetAccount {
  // ... existing fields
  
  normalizedName String  // Lowercase, no punctuation for exact matching
  
  @@index([eventId, normalizedName])
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_normalized_name
```

**Backfill Script:**
```typescript
// prisma/migrations/backfill-normalized-names.ts
import { db } from '@/lib/db';
import { normalizeCompanyName } from '@/lib/services/normalization';

async function backfill() {
  const accounts = await db.targetAccount.findMany();
  
  for (const account of accounts) {
    await db.targetAccount.update({
      where: { id: account.id },
      data: { normalizedName: normalizeCompanyName(account.companyName) },
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Migration runs successfully
- [ ] Index created on eventId + normalizedName
- [ ] Backfill script updates existing records

---

### Ticket 2.1: CSV Upload + Parse

**Description:**  
Create CSV upload endpoint with validation. Parse CSV and return preview.

**Files Created:**
- `eventops/src/app/(dashboard)/import/page.tsx`
- `eventops/src/app/(dashboard)/import/upload/page.tsx`
- `eventops/src/app/api/import/upload/route.ts`
- `eventops/src/lib/services/csv-parser.ts`
- `eventops/src/lib/validations/csv.ts`

**Dependencies:**
```bash
npm install papaparse
npm install -D @types/papaparse
```

**Implementation:**

`src/lib/services/csv-parser.ts`:
```typescript
import Papa from 'papaparse';
import { z } from 'zod';

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export async function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          rows: results.data as Record<string, string>[],
          rowCount: results.data.length,
        });
      },
      error: (error) => reject(error),
    });
  });
}
```

`src/app/api/import/upload/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-utils';
import { parseCSV } from '@/lib/services/csv-parser';

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    await requireAuth();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (!file.name.endsWith('.csv')) {
      throw new Error('File must be a CSV');
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File must be less than 10MB');
    }
    
    const parsed = await parseCSV(file);
    
    // Store in session/cache for next step
    // For now, return preview
    return {
      headers: parsed.headers,
      preview: parsed.rows.slice(0, 10),
      totalRows: parsed.rowCount,
    };
  });
}
```

**Acceptance Criteria:**
- [ ] Can upload CSV file
- [ ] Validates file type
- [ ] Validates file size
- [ ] Returns column headers
- [ ] Returns first 10 rows preview
- [ ] Shows total row count

**Tests:**
```typescript
test('should upload and parse CSV', async () => {
  const csv = 'Company,Name,Title\nGXO,John Doe,VP\n';
  const file = new File([csv], 'test.csv', { type: 'text/csv' });
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/import/upload', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  expect(data.headers).toEqual(['Company', 'Name', 'Title']);
});
```

---

I'll continue with the remaining tickets if you'd like, but this gives you the pattern. Should I:
1. Continue with all remaining Sprint 2-8 tickets in this same detailed format?
2. Create the final SPRINT_PLAN.md file now with what we have?
3. Start implementing the code for Sprint 0?

Let me know how you'd like to proceed!

