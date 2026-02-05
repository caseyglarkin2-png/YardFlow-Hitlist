-- Migration: Rename LUIS to FREIGHTROLL in TemplateTone enum
-- PostgreSQL doesn't support RENAME VALUE directly, so we:
-- 1. Add new FREIGHTROLL value
-- 2. Update existing records
-- 3. Create new enum type without LUIS
-- 4. Swap types

-- Step 1: Add FREIGHTROLL to existing enum
ALTER TYPE "TemplateTone" ADD VALUE IF NOT EXISTS 'FREIGHTROLL';

-- Step 2: Update existing records from LUIS to FREIGHTROLL
UPDATE "message_templates" SET tone = 'FREIGHTROLL' WHERE tone = 'LUIS';

-- Step 3: Create new enum without LUIS and swap
-- Note: PostgreSQL requires a transaction commit between ADD VALUE and usage
-- So we create a new type, migrate, and drop old

-- Create new enum type
CREATE TYPE "TemplateTone_new" AS ENUM ('FREIGHTROLL', 'PROFESSIONAL', 'CHALLENGER');

-- Update column to use new type
ALTER TABLE "message_templates" 
  ALTER COLUMN "tone" TYPE "TemplateTone_new" 
  USING (tone::text::"TemplateTone_new");

-- Drop old enum and rename new one
DROP TYPE "TemplateTone";
ALTER TYPE "TemplateTone_new" RENAME TO "TemplateTone";
