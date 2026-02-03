-- AlterTable
ALTER TABLE "ab_tests" ADD COLUMN     "test_type" TEXT NOT NULL DEFAULT 'TEMPLATE',
ADD COLUMN     "variants" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "templateAId" DROP NOT NULL,
ALTER COLUMN "templateBId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "sequence_enrollments" (
    "id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "exited_at" TIMESTAMP(3),
    "exit_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_steps" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "template_type" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputData" JSONB NOT NULL,
    "outputData" JSONB,
    "errorMessage" TEXT,
    "accountId" TEXT,
    "contactId" TEXT,
    "parentTaskId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_engagement" (
    "id" TEXT NOT NULL,
    "sequence_step_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ab_test_results" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "sequence_step_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sequence_enrollments_sequence_id_idx" ON "sequence_enrollments"("sequence_id");

-- CreateIndex
CREATE INDEX "sequence_enrollments_contact_id_idx" ON "sequence_enrollments"("contact_id");

-- CreateIndex
CREATE INDEX "sequence_enrollments_status_idx" ON "sequence_enrollments"("status");

-- CreateIndex
CREATE INDEX "sequence_steps_enrollment_id_idx" ON "sequence_steps"("enrollment_id");

-- CreateIndex
CREATE INDEX "sequence_steps_status_idx" ON "sequence_steps"("status");

-- CreateIndex
CREATE INDEX "sequence_steps_scheduled_at_idx" ON "sequence_steps"("scheduled_at");

-- CreateIndex
CREATE INDEX "agent_tasks_agentType_status_idx" ON "agent_tasks"("agentType", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_accountId_idx" ON "agent_tasks"("accountId");

-- CreateIndex
CREATE INDEX "agent_tasks_contactId_idx" ON "agent_tasks"("contactId");

-- CreateIndex
CREATE INDEX "agent_tasks_parentTaskId_idx" ON "agent_tasks"("parentTaskId");

-- CreateIndex
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks"("status");

-- CreateIndex
CREATE INDEX "agent_tasks_createdAt_idx" ON "agent_tasks"("createdAt");

-- CreateIndex
CREATE INDEX "email_engagement_sequence_step_id_idx" ON "email_engagement"("sequence_step_id");

-- CreateIndex
CREATE INDEX "email_engagement_event_type_idx" ON "email_engagement"("event_type");

-- CreateIndex
CREATE INDEX "email_engagement_timestamp_idx" ON "email_engagement"("timestamp");

-- CreateIndex
CREATE INDEX "ab_test_results_test_id_idx" ON "ab_test_results"("test_id");

-- CreateIndex
CREATE INDEX "ab_test_results_variant_id_idx" ON "ab_test_results"("variant_id");

-- CreateIndex
CREATE INDEX "ab_test_results_sequence_step_id_idx" ON "ab_test_results"("sequence_step_id");

-- CreateIndex
CREATE INDEX "ab_test_results_contact_id_idx" ON "ab_test_results"("contact_id");

-- CreateIndex
CREATE INDEX "ab_tests_test_type_idx" ON "ab_tests"("test_type");

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "sequence_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "target_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_engagement" ADD CONSTRAINT "email_engagement_sequence_step_id_fkey" FOREIGN KEY ("sequence_step_id") REFERENCES "sequence_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_sequence_step_id_fkey" FOREIGN KEY ("sequence_step_id") REFERENCES "sequence_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
