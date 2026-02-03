-- AlterTable
ALTER TABLE "agent_tasks" ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "custom_fields" JSONB,
ADD COLUMN     "last_contacted_at" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER DEFAULT 50,
ADD COLUMN     "status" TEXT DEFAULT 'active',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tier" TEXT DEFAULT 'Tier 2';

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "agent_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
