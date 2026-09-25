"use server";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { testFireAlert } from "@/lib/alerts/engine";
import {
  ALERT_RULE_SEVERITIES,
  resolveRuleSeverity,
} from "@/lib/alerts/rules-config";
import { db } from "@/db";

const schema = z.object({
  ruleId: z
    .string()
    .min(1)
    .max(32)
    .refine((id) => id in ALERT_RULE_SEVERITIES, "Unknown alert ruleId"),
});

/** Kane-only: create a TEST FIRE alert for the given rule. */
export const testFireAlertAction = actionClient
  .metadata({ actionName: "admin.testFireAlert" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const alert = await testFireAlert(parsedInput.ruleId);
    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "alert.test_fire",
        entityType: "Alert",
        entityId: alert.id,
        meta: {
          ruleId: parsedInput.ruleId,
          severity: resolveRuleSeverity(parsedInput.ruleId),
        },
      },
    });
    return {
      ok: true as const,
      alertId: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      title: alert.title,
    };
  });
