-- Add prospect-related fields to people table
-- These fields are needed for the /api/prospects endpoints

ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "tier" TEXT DEFAULT 'Tier 2';
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "score" INTEGER DEFAULT 50;
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "custom_fields" JSONB;
ALTER TABLE "people" ADD COLUMN IF NOT EXISTS "last_contacted_at" TIMESTAMP(3);
