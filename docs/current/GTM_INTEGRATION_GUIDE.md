# GTM Frontend Integration Guide

This guide details the steps to update the **GTM YardFlow (Vercel)** project to communicate with the **Railway Backend**.

## 1. Environment Variables (Vercel)

Add the following environment variables to your Vercel project:

- `RAILWAY_API_URL`: `https://yardflow-hitlist-production-2f41.up.railway.app`
- `SERVICE_TO_SERVICE_SECRET`: (Get this from Railway Variables or ask the backend team)

## 2. Create API Client

Create a new file `lib/railway-client.ts` in the GTM project:

```typescript
import { auth } from "@/auth"; // or your auth provider

const BASE_URL = process.env.RAILWAY_API_URL;
const SERVICE_KEY = process.env.SERVICE_TO_SERVICE_SECRET;

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export const railwayClient = {
  async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    if (!BASE_URL || !SERVICE_KEY) {
      throw new Error("Missing RAILWAY_API_URL or SERVICE_TO_SERVICE_SECRET");
    }

    const session = await auth();
    const headers = new Headers(options.headers);
    
    // Add S2S Auth Headers
    headers.set("x-service-key", SERVICE_KEY);
    if (session?.user?.id) {
       headers.set("x-user-id", session.user.id);
       headers.set("x-user-email", session.user.email || "");
    } else {
       // Fallback for system calls or unauthenticated calls
       headers.set("x-user-id", "service:gtm-frontend");
    }

    // Handle Query Params
    let url = `${BASE_URL}${endpoint}`;
    if (options.params) {
      const qs = new URLSearchParams(options.params).toString();
      url += `?${qs}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Railway API Error [${res.status}]: ${errorText}`);
    }

    // Handle empty responses
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
};
```

## 3. Update Dashboard Page

Update your dashboard page to fetch data from Railway instead of local DB:

```typescript
// app/dashboard/page.tsx
import { railwayClient } from "@/lib/railway-client";

export default async function Dashboard() {
  const stats = await railwayClient.fetch('/api/dashboards/stats');
  
  return (
    <div>
       <h1>Dashboard</h1>
       <StatsCard data={stats} />
    </div>
  );
}
```

## 4. Verify

1. Deploy Vercel project.
2. Check GTM Dashboard.
3. If endpoints fail with 401, check `SERVICE_TO_SERVICE_SECRET` match.
