-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('EMAIL', 'LINKEDIN', 'PHONE');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('DRAFT', 'SENT', 'RESPONDED', 'BOUNCED', 'NO_RESPONSE', 'SCHEDULED', 'OPENED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetPersonas" TEXT,
    "minIcpScore" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "goals" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_dossiers" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "companyOverview" TEXT,
    "recentNews" TEXT,
    "industryContext" TEXT,
    "keyPainPoints" TEXT,
    "techStack" TEXT,
    "companySize" TEXT,
    "socialPresence" TEXT,
    "rawData" TEXT,
    "researchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "researchedBy" TEXT,
    "facilityCount" TEXT,
    "locations" TEXT,
    "operationalScale" TEXT,

    CONSTRAINT "company_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_insights" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleContext" TEXT,
    "likelyPainPoints" TEXT,
    "suggestedApproach" TEXT,
    "roiOpportunity" TEXT,
    "confidence" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "contact_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "location" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetingType" TEXT,
    "outcome" TEXT,
    "nextSteps" TEXT,
    "followUpDate" TIMESTAMP(3),
    "dealStage" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "OutreachChannel" NOT NULL,
    "subject" TEXT,
    "template" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "templateId" TEXT,
    "sentBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bouncedAt" TIMESTAMP(3),
    "campaignId" TEXT,
    "openedAt" TIMESTAMP(3),
    "sequenceId" TEXT,
    "gmailMessageId" TEXT,
    "gmailThreadId" TEXT,
    "lastChecked" TIMESTAMP(3),

    CONSTRAINT "outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin" TEXT,
    "notes" TEXT,
    "isExecOps" BOOLEAN NOT NULL DEFAULT false,
    "isOps" BOOLEAN NOT NULL DEFAULT false,
    "isProc" BOOLEAN NOT NULL DEFAULT false,
    "isSales" BOOLEAN NOT NULL DEFAULT false,
    "isTech" BOOLEAN NOT NULL DEFAULT false,
    "isNonOps" BOOLEAN NOT NULL DEFAULT false,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailStatus" TEXT,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_calculations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "facilityCount" INTEGER,
    "operationalScale" TEXT,
    "annualSavings" DOUBLE PRECISION,
    "paybackPeriod" INTEGER,
    "assumptions" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" TEXT,

    CONSTRAINT "roi_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_history" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "oldScore" INTEGER,
    "newScore" INTEGER,
    "reason" TEXT NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_accounts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "headquarters" TEXT,
    "icpScore" INTEGER,
    "notes" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "activeEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "googleSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "googleSyncPaused" BOOLEAN NOT NULL DEFAULT false,
    "googleSyncDryRun" BOOLEAN NOT NULL DEFAULT true,
    "googleRateLimit" INTEGER NOT NULL DEFAULT 10,
    "googleSyncAuditLog" JSONB NOT NULL DEFAULT '[]',
    "lastGoogleSync" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "templateAId" TEXT NOT NULL,
    "templateBId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 100,
    "winnerThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "results" JSONB,
    "createdBy" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_sync_locks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lockType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_sync_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_content" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "thumbnailUrl" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "fileSize" BIGINT,
    "duration" INTEGER,
    "mimeType" TEXT,
    "sourceId" TEXT,
    "sourceLink" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_module_content" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_module_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_shares" (
    "id" TEXT NOT NULL,
    "contentIds" TEXT[],
    "shareCode" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_patterns" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "companyDomain" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "examples" TEXT[],
    "verifiedCount" INTEGER NOT NULL DEFAULT 0,
    "bouncedCount" INTEGER NOT NULL DEFAULT 0,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_profiles" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "foundVia" TEXT NOT NULL DEFAULT 'google_search',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachSequence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalEnrolled" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalActive" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OutreachSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceEnrollment" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "personId" TEXT,
    "accountId" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "pauseReason" TEXT,

    CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailActivity" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "spamReportAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'sent',
    "messageId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "EmailActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_eventId_idx" ON "campaigns"("eventId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "company_dossiers_accountId_key" ON "company_dossiers"("accountId");

-- CreateIndex
CREATE INDEX "company_dossiers_accountId_idx" ON "company_dossiers"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "contact_insights_personId_key" ON "contact_insights"("personId");

-- CreateIndex
CREATE INDEX "contact_insights_personId_idx" ON "contact_insights"("personId");

-- CreateIndex
CREATE INDEX "meetings_personId_idx" ON "meetings"("personId");

-- CreateIndex
CREATE INDEX "meetings_scheduledAt_idx" ON "meetings"("scheduledAt");

-- CreateIndex
CREATE INDEX "outreach_campaignId_idx" ON "outreach"("campaignId");

-- CreateIndex
CREATE INDEX "outreach_personId_idx" ON "outreach"("personId");

-- CreateIndex
CREATE INDEX "outreach_status_idx" ON "outreach"("status");

-- CreateIndex
CREATE INDEX "outreach_gmailThreadId_idx" ON "outreach"("gmailThreadId");

-- CreateIndex
CREATE INDEX "outreach_lastChecked_idx" ON "outreach"("lastChecked");

-- CreateIndex
CREATE INDEX "outreach_status_lastChecked_idx" ON "outreach"("status", "lastChecked");

-- CreateIndex
CREATE INDEX "people_accountId_idx" ON "people"("accountId");

-- CreateIndex
CREATE INDEX "people_assignedTo_idx" ON "people"("assignedTo");

-- CreateIndex
CREATE INDEX "roi_calculations_accountId_idx" ON "roi_calculations"("accountId");

-- CreateIndex
CREATE INDEX "score_history_accountId_idx" ON "score_history"("accountId");

-- CreateIndex
CREATE INDEX "sequences_campaignId_idx" ON "sequences"("campaignId");

-- CreateIndex
CREATE INDEX "target_accounts_eventId_idx" ON "target_accounts"("eventId");

-- CreateIndex
CREATE INDEX "target_accounts_assignedTo_idx" ON "target_accounts"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activities_entityType_entityId_idx" ON "activities"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

-- CreateIndex
CREATE INDEX "saved_searches_userId_idx" ON "saved_searches"("userId");

-- CreateIndex
CREATE INDEX "saved_searches_entityType_idx" ON "saved_searches"("entityType");

-- CreateIndex
CREATE INDEX "saved_searches_isGlobal_idx" ON "saved_searches"("isGlobal");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "ab_tests_eventId_idx" ON "ab_tests"("eventId");

-- CreateIndex
CREATE INDEX "ab_tests_status_idx" ON "ab_tests"("status");

-- CreateIndex
CREATE INDEX "google_sync_locks_userId_lockType_idx" ON "google_sync_locks"("userId", "lockType");

-- CreateIndex
CREATE INDEX "google_sync_locks_expiresAt_idx" ON "google_sync_locks"("expiresAt");

-- CreateIndex
CREATE INDEX "training_content_eventId_idx" ON "training_content"("eventId");

-- CreateIndex
CREATE INDEX "training_content_userId_idx" ON "training_content"("userId");

-- CreateIndex
CREATE INDEX "training_content_source_idx" ON "training_content"("source");

-- CreateIndex
CREATE INDEX "training_content_status_idx" ON "training_content"("status");

-- CreateIndex
CREATE INDEX "training_module_content_moduleId_idx" ON "training_module_content"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "training_module_content_moduleId_contentId_key" ON "training_module_content"("moduleId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "training_shares_shareCode_key" ON "training_shares"("shareCode");

-- CreateIndex
CREATE INDEX "training_shares_shareCode_idx" ON "training_shares"("shareCode");

-- CreateIndex
CREATE INDEX "email_patterns_accountId_idx" ON "email_patterns"("accountId");

-- CreateIndex
CREATE INDEX "email_patterns_companyDomain_idx" ON "email_patterns"("companyDomain");

-- CreateIndex
CREATE INDEX "email_patterns_confidence_idx" ON "email_patterns"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "email_patterns_accountId_patternType_key" ON "email_patterns"("accountId", "patternType");

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_profiles_personId_key" ON "linkedin_profiles"("personId");

-- CreateIndex
CREATE INDEX "linkedin_profiles_personId_idx" ON "linkedin_profiles"("personId");

-- CreateIndex
CREATE INDEX "linkedin_profiles_confidence_idx" ON "linkedin_profiles"("confidence");

-- CreateIndex
CREATE INDEX "OutreachSequence_createdBy_idx" ON "OutreachSequence"("createdBy");

-- CreateIndex
CREATE INDEX "OutreachSequence_status_idx" ON "OutreachSequence"("status");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_sequenceId_idx" ON "SequenceEnrollment"("sequenceId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_personId_idx" ON "SequenceEnrollment"("personId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_accountId_idx" ON "SequenceEnrollment"("accountId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_status_idx" ON "SequenceEnrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailActivity_messageId_key" ON "EmailActivity"("messageId");

-- CreateIndex
CREATE INDEX "EmailActivity_enrollmentId_idx" ON "EmailActivity"("enrollmentId");

-- CreateIndex
CREATE INDEX "EmailActivity_messageId_idx" ON "EmailActivity"("messageId");

-- CreateIndex
CREATE INDEX "EmailActivity_status_idx" ON "EmailActivity"("status");

-- CreateIndex
CREATE INDEX "EmailActivity_sentAt_idx" ON "EmailActivity"("sentAt");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_dossiers" ADD CONSTRAINT "company_dossiers_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "target_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_insights" ADD CONSTRAINT "contact_insights_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "target_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_calculations" ADD CONSTRAINT "roi_calculations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "target_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_history" ADD CONSTRAINT "score_history_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "target_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_accounts" ADD CONSTRAINT "target_accounts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_accounts" ADD CONSTRAINT "target_accounts_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeEventId_fkey" FOREIGN KEY ("activeEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_content" ADD CONSTRAINT "training_content_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_content" ADD CONSTRAINT "training_content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_module_content" ADD CONSTRAINT "training_module_content_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "training_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_shares" ADD CONSTRAINT "training_shares_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_patterns" ADD CONSTRAINT "email_patterns_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "target_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linkedin_profiles" ADD CONSTRAINT "linkedin_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "OutreachSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "target_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailActivity" ADD CONSTRAINT "EmailActivity_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SequenceEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
