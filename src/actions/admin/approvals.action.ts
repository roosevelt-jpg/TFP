"use server";

import * as z from "zod";

import { decideApproval, executeApprovedAction } from "@/lib/admin/approvals";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/db";

const decideSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
});

export const decideApprovalAction = actionClient
  .metadata({ actionName: "admin.decideApproval" })
  .inputSchema(decideSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const updated = await decideApproval({
      id: parsedInput.id,
      decision: parsedInput.decision,
      actor: session.user.email,
    });

    if (parsedInput.decision === "approved") {
      const executed = await executeApprovedAction({
        id: updated.id,
        actor: session.user.email,
      });
      return {
        status: "executed" as const,
        verification: executed.verificationResult,
      };
    }

    return { status: updated.status };
  });

const ackSchema = z.object({
  id: z.string().min(1),
});

export const acknowledgeAlertAction = actionClient
  .metadata({ actionName: "admin.acknowledgeAlert" })
  .inputSchema(ackSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "leah", "lemoni"]);
    await db.alert.update({
      where: { id: parsedInput.id },
      data: { status: "acknowledged", acknowledgedAt: new Date() },
    });
    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "alert.acknowledged",
        entityType: "Alert",
        entityId: parsedInput.id,
      },
    });
    return { ok: true as const };
  });
