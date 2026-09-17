-- Client 360 CRM: link Customer ↔ PersonCustomer, profile fields, staff, sessions, notes

-- AlterTable
ALTER TABLE "PersonCustomer" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "PersonCustomer" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "PersonCustomer" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "PersonCustomer" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "PersonCustomer" ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;
ALTER TABLE "PersonCustomer" ADD COLUMN IF NOT EXISTS "bioSummary" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PersonCustomer_customerId_key" ON "PersonCustomer"("customerId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PersonCustomer_customerId_fkey'
  ) THEN
    ALTER TABLE "PersonCustomer"
      ADD CONSTRAINT "PersonCustomer_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ClientStaffRole" AS ENUM ('coach', 'cs', 'setter', 'am', 'fulfilment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClientSessionType" AS ENUM ('coaching_call', 'checkin', 'assessment', 'training', 'onboarding', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClientSessionStatus" AS ENUM ('scheduled', 'completed', 'no_show', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientStaffAssignment" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "staffPersonKey" TEXT NOT NULL,
    "staffUserId" TEXT,
    "role" "ClientStaffRole" NOT NULL DEFAULT 'coach',
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ClientStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientSession" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "ClientSessionType" NOT NULL DEFAULT 'coaching_call',
    "status" "ClientSessionStatus" NOT NULL DEFAULT 'completed',
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ NOT NULL,
    "completedAt" TIMESTAMPTZ,
    "durationMin" INTEGER,
    "staffPersonKey" TEXT,
    "callId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClientNote" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClientStaffAssignment_personId_endedAt_idx" ON "ClientStaffAssignment"("personId", "endedAt");
CREATE INDEX IF NOT EXISTS "ClientStaffAssignment_staffPersonKey_endedAt_idx" ON "ClientStaffAssignment"("staffPersonKey", "endedAt");
CREATE INDEX IF NOT EXISTS "ClientSession_personId_scheduledAt_idx" ON "ClientSession"("personId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "ClientSession_customerId_scheduledAt_idx" ON "ClientSession"("customerId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "ClientSession_status_scheduledAt_idx" ON "ClientSession"("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "ClientNote_personId_createdAt_idx" ON "ClientNote"("personId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientStaffAssignment_personId_fkey'
  ) THEN
    ALTER TABLE "ClientStaffAssignment"
      ADD CONSTRAINT "ClientStaffAssignment_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientSession_personId_fkey'
  ) THEN
    ALTER TABLE "ClientSession"
      ADD CONSTRAINT "ClientSession_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientNote_personId_fkey'
  ) THEN
    ALTER TABLE "ClientNote"
      ADD CONSTRAINT "ClientNote_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
