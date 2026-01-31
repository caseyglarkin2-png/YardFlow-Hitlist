import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 Configuration
 * 
 * This file is required for Prisma 7 with driver adapters.
 * The datasource URL is no longer specified in schema.prisma.
 * 
 * @see https://pris.ly/d/config-datasource
 */
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
