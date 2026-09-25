import { schemaTask, schedules } from "@trigger.dev/sdk";
import * as z from "zod";

import { db } from "@/db";
import { createApprovalRequest } from "@/lib/admin/approvals";
import { evaluateAlertRules } from "@/lib/alerts/engine";
import { buildDailyReport, buildDailyTodo } from "@/lib/alerts/daily-report";
import { sendP2Digest } from "@/lib/alerts/p2-digest";
import { sendTomorrowCallDigest } from "@/lib/alerts/call-digest";
import { runSpecialistCheck } from "@/lib/cto/specialist";
import {
  buildAffiliateMondayPrompt,
  buildMondayContentPlan,
} from "@/lib/content/social-manager";
import { sendTomorrowPostsDigest } from "@/lib/content/tomorrow-digest";
import { deliverSundayQuoteBatchForApproval } from "@/lib/training/quote-batch";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import { ensureAccountabilityTodos } from "@/lib/admin/team-monitor";
import { computeAndStoreScorecards } from "@/lib/scorecards/compute";
import { sendWeeklyPersonReviews } from "@/lib/scorecards/weekly-review";

export const evaluateAlertsTask = schemaTask({
  id: "command.evaluate-alerts",
  schema: z.object({}),
  run: async () => evaluateAlertRules(),
});

export const alertsSchedule = schedules.task({
  id: "command.alerts-schedule",
  cron: { pattern: "*/5 * * * *", environments: ["PRODUCTION"] },
  run: async () => evaluateAlertRules(),
});

/**
 * P2 digest every 2h during Dubai ~08:00–22:00 (UTC 04:00–18:00).
 */
export const p2DigestSchedule = schedules.task({
  id: "command.p2-digest",
  cron: {
    pattern: "0 4,6,8,10,12,14,16,18 * * *",
    environments: ["PRODUCTION"],
  },
  run: async () => sendP2Digest({ skipIfEmpty: false }),
});

export const dailyTodoTask = schedules.task({
  id: "command.daily-todo",
  cron: { pattern: "30 3 * * *", environments: ["PRODUCTION"] },
  run: async () => {
    const kaneChatId = await getKaneTelegramChatId();
    if (!kaneChatId) return;
    const text = await buildDailyTodo();
    await sendTelegramMessage({
      chatId: kaneChatId,
      text,
    });
  },
});

export const dailyReportTask = schedules.task({
  id: "command.daily-report",
  cron: { pattern: "0 4 * * *", environments: ["PRODUCTION"] },
  run: async () => {
    const kaneChatId = await getKaneTelegramChatId();
    if (!kaneChatId) return;
    const text = await buildDailyReport();
    await sendTelegramMessage({
      chatId: kaneChatId,
      text,
    });
  },
});

export const mondayContentPlanTask = schedules.task({
  id: "command.monday-content-plan",
  cron: { pattern: "0 5 * * 1", environments: ["PRODUCTION"] },
  run: async () => buildMondayContentPlan(),
});

export const mondayAffiliateTask = schedules.task({
  id: "command.monday-affiliate",
  cron: { pattern: "0 5 * * 1", environments: ["PRODUCTION"] },
  run: async () => buildAffiliateMondayPrompt(),
});

/** Sunday 18:00 Dubai ≈ 14:00 UTC — quote batch draft for Kane (no WhatsApp send). */
export const sundayQuoteBatchTask = schedules.task({
  id: "command.sunday-quote-batch",
  cron: { pattern: "0 14 * * 0", environments: ["PRODUCTION"] },
  run: async () => deliverSundayQuoteBatchForApproval(),
});

/** CL4 — 20:00 Dubai ≈ 16:00 UTC — tomorrow's call list to Kane + Lemoni. */
export const tomorrowCallDigestTask = schedules.task({
  id: "command.tomorrow-call-digest",
  cron: { pattern: "0 16 * * *", environments: ["PRODUCTION"] },
  run: async () => sendTomorrowCallDigest(),
});

/** CT12 — 20:00 Dubai ≈ 16:00 UTC — tomorrow's posts digest to Kane. */
export const tomorrowPostsDigestTask = schedules.task({
  id: "command.tomorrow-posts-digest",
  cron: { pattern: "0 16 * * *", environments: ["PRODUCTION"] },
  run: async () => sendTomorrowPostsDigest(),
});

/**
 * Monday weekly person reviews — after daily scorecards (03:15 UTC)
 * and alongside the 09:00 Dubai Monday pack (05:00 UTC).
 */
export const weeklyPersonReviewsTask = schedules.task({
  id: "command.weekly-person-reviews",
  cron: { pattern: "10 5 * * 1", environments: ["PRODUCTION"] },
  run: async () => sendWeeklyPersonReviews(),
});

export const draftMetaPauseTask = schemaTask({
  id: "command.draft-meta-pause",
  schema: z.object({
    adSetId: z.string(),
    adSetName: z.string(),
    reason: z.string(),
  }),
  run: async (payload) => {
    const check = await runSpecialistCheck({
      action: `Pause ad set "${payload.adSetName}"`,
      objectIds: { adSetId: payload.adSetId },
      domain: "meta",
      afterState: { status: "PAUSED", reason: payload.reason },
    });

    if (!check.ok) {
      throw new Error(check.blockedReason ?? "Specialist check blocked");
    }

    const approval = await createApprovalRequest({
      action: `Pause ad set "${payload.adSetName}"`,
      objectIds: { adSetId: payload.adSetId },
      reach: "1 ad set, no customers",
      reversible: true,
      specialistVerdict: `${check.verdict} ${payload.reason}`.trim(),
      createdBy: "cto-agent",
    });

    const kaneChatId = await getKaneTelegramChatId();
    if (kaneChatId) {
      await sendTelegramMessage({
        chatId: kaneChatId,
        text: [
          `<b>Approval needed</b>`,
          `WHAT: Pause ad set "${payload.adSetName}"`,
          `REACH: 1 ad set`,
          `REVERSIBLE: Yes`,
          `OBJECT: ${payload.adSetId}`,
          `CHECK: ${check.verdict}`,
          `REASON: ${payload.reason}`,
        ].join("\n"),
        replyMarkup: {
          inline_keyboard: [
            [
              { text: "Approve", callback_data: `approve:${approval.id}` },
              { text: "Reject", callback_data: `reject:${approval.id}` },
            ],
          ],
        },
      });
    }

    return { approvalId: approval.id };
  },
});

export const reconcileOpenApprovals = schemaTask({
  id: "command.expire-approvals",
  schema: z.object({}),
  run: async () => {
    const result = await db.approvalRequest.updateMany({
      where: {
        status: "pending",
        expiresAt: { lt: new Date() },
      },
      data: { status: "expired" },
    });
    return { expired: result.count };
  },
});

export const accountabilityTodosSchedule = schedules.task({
  id: "command.accountability-todos",
  cron: { pattern: "0 */6 * * *", environments: ["PRODUCTION"] },
  run: async () => ensureAccountabilityTodos(),
});

/** Daily live scorecards → KpiValue for Leah / Lemoni / Indigo / Asim. */
export const scorecardsTask = schemaTask({
  id: "command.compute-scorecards",
  schema: z.object({}),
  run: async () => computeAndStoreScorecards(),
});

export const scorecardsSchedule = schedules.task({
  id: "command.scorecards-daily",
  cron: { pattern: "15 3 * * *", environments: ["PRODUCTION"] },
  run: async () => computeAndStoreScorecards(),
});
