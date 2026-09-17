import { schemaTask, schedules } from "@trigger.dev/sdk";
import * as z from "zod";

import { db } from "@/db";
import { createApprovalRequest } from "@/lib/admin/approvals";
import { evaluateAlertRules } from "@/lib/alerts/engine";
import { buildDailyReport, buildDailyTodo } from "@/lib/alerts/daily-report";
import { runSpecialistCheck } from "@/lib/cto/specialist";
import {
  buildAffiliateMondayPrompt,
  buildMondayContentPlan,
} from "@/lib/content/social-manager";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import { ensureAccountabilityTodos } from "@/lib/admin/team-monitor";

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

export const draftMetaPauseTask = schemaTask({
  id: "command.draft-meta-pause",
  schema: z.object({
    adSetId: z.string(),
    adSetName: z.string(),
    reason: z.string(),
  }),
  run: async (payload) => {
    const check = runSpecialistCheck({
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
        text: `<b>Approval needed</b>\n${approval.action}\n${check.verdict}\n${payload.reason}`,
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
