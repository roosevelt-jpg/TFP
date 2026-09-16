"use server";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/db";

const schema = z.object({
  id: z.string().min(1),
  value: z.number(),
  enabled: z.boolean(),
});

export const updateThresholdAction = actionClient
  .metadata({ actionName: "admin.updateThreshold" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    await db.alertThreshold.update({
      where: { id: parsedInput.id },
      data: {
        value: parsedInput.value,
        enabled: parsedInput.enabled,
        updatedBy: session.user.email,
      },
    });
    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "threshold.update",
        entityType: "AlertThreshold",
        entityId: parsedInput.id,
        after: parsedInput,
      },
    });
    return { ok: true as const };
  });
