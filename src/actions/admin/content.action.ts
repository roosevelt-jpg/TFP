"use server";

import * as z from "zod";

import { createApprovalRequest } from "@/lib/admin/approvals";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/db";

const schema = z.object({
  postCardId: z.string().min(1),
});

export const createContentApprovalAction = actionClient
  .metadata({ actionName: "admin.createContentApproval" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const card = await db.postCard.findUniqueOrThrow({
      where: { id: parsedInput.postCardId },
      include: { asset: true },
    });

    if (!card.compliancePass) {
      throw new Error("Cannot approve a compliance failure");
    }

    const approval = await createApprovalRequest({
      action: `Schedule post: ${card.asset.title} → ${card.platform}`,
      objectIds: { postCardId: card.id },
      reach: `${card.platform} · ${card.account}`,
      reversible: true,
      specialistVerdict:
        "Compliance passed; approval_mode=every_post; schedule only after Kane approval.",
      createdBy: session.user.email,
    });

    await db.postCard.update({
      where: { id: card.id },
      data: { approvalId: approval.id },
    });

    return { approvalId: approval.id };
  });
