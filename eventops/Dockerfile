FROM node:20-slim AS base

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

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
FROM node:20-slim AS runner

WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy necessary files from builder
COPY --from=base /app/package*.json ./
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["npm", "start"]
