-- AlterTable
ALTER TABLE "LeadThread" ADD COLUMN IF NOT EXISTS "setterKey" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeadThread_setterKey_idx" ON "LeadThread"("setterKey");
