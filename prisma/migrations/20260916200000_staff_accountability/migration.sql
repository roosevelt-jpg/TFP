-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'asim';

-- CreateEnum
CREATE TYPE "StaffTodoStatus" AS ENUM ('open', 'done', 'skipped');
CREATE TYPE "StaffTodoSource" AS ENUM ('system', 'kane', 'self');
CREATE TYPE "StaffReportStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "acceptedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffInvite_tokenHash_key" ON "StaffInvite"("tokenHash");
CREATE INDEX "StaffInvite_email_idx" ON "StaffInvite"("email");
CREATE INDEX "StaffInvite_expiresAt_idx" ON "StaffInvite"("expiresAt");

CREATE TABLE "StaffTodo" (
    "id" TEXT NOT NULL,
    "personKey" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMPTZ,
    "status" "StaffTodoStatus" NOT NULL DEFAULT 'open',
    "source" "StaffTodoSource" NOT NULL DEFAULT 'system',
    "linkedReportId" TEXT,
    "createdBy" TEXT,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StaffTodo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffTodo_personKey_status_idx" ON "StaffTodo"("personKey", "status");
CREATE INDEX "StaffTodo_userId_status_idx" ON "StaffTodo"("userId", "status");
CREATE INDEX "StaffTodo_dueAt_idx" ON "StaffTodo"("dueAt");

CREATE TABLE "StaffReport" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "personKey" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "StaffReportStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMPTZ,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StaffReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffReport_personKey_status_idx" ON "StaffReport"("personKey", "status");
CREATE INDEX "StaffReport_authorUserId_createdAt_idx" ON "StaffReport"("authorUserId", "createdAt");
CREATE INDEX "StaffReport_status_submittedAt_idx" ON "StaffReport"("status", "submittedAt");
