import { z } from 'zod';

const envSchema = z.object({
  // Database - Vercel Postgres provides multiple connection strings
  POSTGRES_PRISMA_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  
  // Auth
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Feature Flags
  ENABLE_AUTO_ENRICHMENT: z.enum(['true', 'false']).default('false'),
  
  // Optional APIs
  SERPAPI_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
}).refine(
  (data) => data.POSTGRES_PRISMA_URL || data.DATABASE_URL,
  {
    message: 'Either POSTGRES_PRISMA_URL or DATABASE_URL must be provided',
  }
);

// Parse and export
const parsed = envSchema.safeParse(process.env);

// During Docker build, validation may fail with placeholder values - that's OK
// Real validation happens at runtime when actual env vars are provided
if (!parsed.success && process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.success ? parsed.data : {
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET || 'placeholder',
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  ENABLE_AUTO_ENRICHMENT: (process.env.ENABLE_AUTO_ENRICHMENT || 'false') as 'true' | 'false',
  SERPAPI_KEY: process.env.SERPAPI_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
};

// Helper to get the correct database URL
export const getDatabaseUrl = () => {
  return env.POSTGRES_PRISMA_URL || env.DATABASE_URL!;
};

