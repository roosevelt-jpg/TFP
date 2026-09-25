import "server-only";

import { db } from "@/db";
import { dubaiWeekStartMonday } from "@/lib/content/social-manager";
import { ContentState } from "@/lib/content/states";

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function upsertKpi(
  personKey: string,
  kpiId: string,
  date: Date,
  value: string | number,
  source: string,
) {
  const v = String(value);
  await db.kpiValue.upsert({
    where: { personKey_kpiId_date: { personKey, kpiId, date } },
    create: {
      personKey,
      kpiId,
      date,
      value: v,
      source,
      label: "calculated",
    },
    update: {
      value: v,
      source,
      label: "calculated",
    },
  });
}

export type SmmScoreResult = {
  date: string;
  planOnTime: number;
  calendarFillPct: number;
  complianceFirstPassPct: number;
};

/**
 * Part 07 §13.3 — CTO scores the social media manager:
 * plan-on-time, calendar fill %, compliance first-pass %.
 * Written to KpiValue for lemoni (content role) + social_manager.
 */
export async function computeAndStoreSmmScores(
  now = new Date(),
): Promise<SmmScoreResult> {
  const today = startOfUtcDay(now);
  const weekStart = dubaiWeekStartMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  // Monday 18:00 Dubai ≈ 14:00 UTC
  const planDeadline = new Date(weekStart);
  planDeadline.setUTCHours(14, 0, 0, 0);

  const [plan, scheduled, daysWithSlots, reviewed] = await Promise.all([
    db.weeklyPostingPlan.findUnique({ where: { weekStart } }),
    db.postCard.findMany({
      where: {
        status: {
          in: [
            ContentState.scheduled,
            "scheduled",
            ContentState.published,
            "posted",
          ],
        },
        scheduledAt: { gte: weekStart, lt: weekEnd },
      },
      select: { scheduledAt: true },
    }),
    // Will compute fill from scheduled
    Promise.resolve(null),
    db.postCard.findMany({
      where: {
        updatedAt: { gte: weekStart, lt: weekEnd },
        OR: [
          { compliancePass: true },
          { compliancePass: false },
          { complianceResult: { not: null } },
        ],
      },
      select: { compliancePass: true, complianceResult: true },
    }),
  ]);
  void daysWithSlots;

  // Plan on time: agreed by Monday 18:00 Dubai
  let planOnTime = 0;
  if (plan?.status === "agreed" && plan.agreedAt) {
    planOnTime = plan.agreedAt <= planDeadline ? 1 : 0;
  } else if (plan?.status === "agreed") {
    planOnTime = 1;
  }

  // Calendar fill: days Tue–Sun (6 content days) with ≥1 scheduled/published
  const filled = new Set<string>();
  for (const s of scheduled) {
    if (!s.scheduledAt) continue;
    filled.add(s.scheduledAt.toISOString().slice(0, 10));
  }
  // Count Mon–Sun for fill denominator (7)
  let daysInWeekWithContent = 0;
  for (let d = 0; d < 7; d++) {
    const day = new Date(weekStart);
    day.setUTCDate(day.getUTCDate() + d);
    if (filled.has(day.toISOString().slice(0, 10))) daysInWeekWithContent += 1;
  }
  const calendarFillPct = Math.round((daysInWeekWithContent / 7) * 100);

  // First-pass compliance: share of reviewed cards that passed on first check
  const reviewedCount = reviewed.length;
  const passed = reviewed.filter((r) => r.compliancePass === true).length;
  const complianceFirstPassPct =
    reviewedCount > 0 ? Math.round((passed / reviewedCount) * 100) : 0;

  const scores = {
    planOnTime,
    calendarFillPct,
    complianceFirstPassPct,
  };

  for (const personKey of ["lemoni", "social_manager"] as const) {
    await upsertKpi(
      personKey,
      "SMM plan-on-time",
      today,
      scores.planOnTime,
      "smm-score",
    );
    await upsertKpi(
      personKey,
      "SMM calendar fill %",
      today,
      scores.calendarFillPct,
      "smm-score",
    );
    await upsertKpi(
      personKey,
      "SMM compliance first-pass %",
      today,
      scores.complianceFirstPassPct,
      "smm-score",
    );
  }

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "content.smm_score",
      meta: {
        weekStart: weekStart.toISOString().slice(0, 10),
        ...scores,
        scheduled: scheduled.length,
        reviewed: reviewedCount,
      },
    },
  });

  return {
    date: today.toISOString().slice(0, 10),
    ...scores,
  };
}
