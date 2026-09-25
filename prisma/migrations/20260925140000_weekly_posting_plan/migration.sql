-- Weekly Posting Plan (WPP) for Monday strategy review / CT11
CREATE TABLE "WeeklyPostingPlan" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "agreedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WeeklyPostingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyPostingPlan_weekStart_key" ON "WeeklyPostingPlan"("weekStart");
CREATE INDEX "WeeklyPostingPlan_status_weekStart_idx" ON "WeeklyPostingPlan"("status", "weekStart");
