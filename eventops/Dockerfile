FROM node:22-slim AS base

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and Prisma schema first for layer caching
# Bust cache: 2026-02-02 - added prospect fields to people model
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Set required environment variables for build-time validation
# These are dummy values only used for build; real values come from Render
ENV AUTH_SECRET="this-is-a-build-time-placeholder-secret-thats-long-enough-32-chars"
ENV POSTGRES_PRISMA_URL="postgresql://placeholder:placeholder@localhost:5432/build"
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/build"
ENV NODE_ENV=production

# Build Next.js app (requires devDependencies)
RUN npm run build

# Production stage
FROM node:22-slim AS runner

WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy Next.js standalone output (includes node_modules it needs)
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Copy Prisma files (required for Prisma 7 runtime with driver adapter)
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Use standalone server directly (not npm start)
CMD ["node", "server.js"]
