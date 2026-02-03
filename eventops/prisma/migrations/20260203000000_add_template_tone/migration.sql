-- CreateEnum
CREATE TYPE "TemplateTone" AS ENUM ('LUIS', 'PROFESSIONAL', 'CHALLENGER');

-- AlterTable: Add tone fields to message_templates
ALTER TABLE "message_templates" ADD COLUMN "tone" "TemplateTone";
ALTER TABLE "message_templates" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "message_templates" ADD COLUMN "createdBy" TEXT;
