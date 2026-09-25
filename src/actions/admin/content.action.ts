"use server";

import * as z from "zod";

import {
  createApprovalRequest,
  decideApproval,
  executeApprovedAction,
} from "@/lib/admin/approvals";
import { loadPostCardFlags } from "@/lib/content/load-flags";
import {
  flagsBlockApproval,
  flagsBlockOneTap,
} from "@/lib/content/post-card-flags";
import { ContentState } from "@/lib/content/states";
import { updatePostCardFields } from "@/lib/content/void-approval";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/db";

const SEND_BACK_REASONS = [
  "framing",
  "pacing",
  "captions",
  "brand",
  "compliance",
  "other",
] as const;

async function createContentApprovalForCard(input: {
  postCardId: string;
  actor: string;
  healthClaimConfirmation?: string;
}) {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: input.postCardId },
    include: { asset: true },
  });

  if (!card.asset.publicConsent || !card.asset.creatorLicence) {
    throw new Error(
      "Cannot approve until public consent and creator licence are recorded",
    );
  }

  const { flags } = await loadPostCardFlags(card.id);
  if (flagsBlockApproval(flags)) {
    throw new Error("Cannot approve — consent or licence flag still open");
  }

  if (!card.compliancePass) {
    const healthFail = /banned health|hormone|trt|medical|claim/i.test(
      card.complianceResult ?? "",
    );
    if (healthFail) {
      const conf = (input.healthClaimConfirmation ?? "").trim();
      if (conf.toLowerCase() !== "confirm health claim") {
        throw new Error(
          'Health-claim FAIL needs typed confirmation: type "confirm health claim"',
        );
      }
    } else {
      throw new Error("Cannot approve a compliance failure");
    }
  } else if (flagsBlockOneTap(flags) && flags.some((f) => f.id === "compliance")) {
    throw new Error("Cannot one-tap approve while blocking flags are open");
  }

  const flagSummary = flags.map((f) => f.label).join("; ") || "none";

  const approval = await createApprovalRequest({
    action: `Schedule post: ${card.asset.title} → ${card.platform}`,
    objectIds: { postCardId: card.id },
    reach: `${card.platform} · ${card.account}`,
    reversible: true,
    specialistVerdict: `Compliance: ${card.complianceResult ?? "—"}; flags: ${flagSummary}; approval_mode=every_post`,
    createdBy: input.actor,
  });

  await db.postCard.update({
    where: { id: card.id },
    data: { approvalId: approval.id },
  });

  return { approvalId: approval.id };
}

async function approveAndExecute(approvalId: string, actor: string) {
  await decideApproval({
    id: approvalId,
    decision: "approved",
    actor,
  });
  await executeApprovedAction({ id: approvalId, actor });
}

const createSchema = z.object({
  postCardId: z.string().min(1),
  healthClaimConfirmation: z.string().max(200).optional(),
});

export const createContentApprovalAction = actionClient
  .metadata({ actionName: "admin.createContentApproval" })
  .inputSchema(createSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    return createContentApprovalForCard({
      postCardId: parsedInput.postCardId,
      actor: session.user.email,
      healthClaimConfirmation: parsedInput.healthClaimConfirmation,
    });
  });

const editCaptionSchema = z.object({
  postCardId: z.string().min(1),
  caption: z.string().max(2200),
  approveAfter: z.boolean().default(false),
});

export const editPostCardCaptionAction = actionClient
  .metadata({ actionName: "admin.editPostCardCaption" })
  .inputSchema(editCaptionSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const { voided } = await updatePostCardFields(
      parsedInput.postCardId,
      session.user.email,
      { caption: parsedInput.caption },
    );

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "content.edit_caption",
        entityType: "PostCard",
        entityId: parsedInput.postCardId,
        meta: { voided, approveAfter: parsedInput.approveAfter },
      },
    });

    if (!parsedInput.approveAfter) {
      return { voided, approvalId: null as string | null };
    }

    const { approvalId } = await createContentApprovalForCard({
      postCardId: parsedInput.postCardId,
      actor: session.user.email,
    });
    await approveAndExecute(approvalId, session.user.email);
    return { voided, approvalId };
  });

const sendBackSchema = z.object({
  postCardId: z.string().min(1),
  reason: z.enum(SEND_BACK_REASONS),
  note: z.string().max(500).optional(),
});

export const sendBackPostCardAction = actionClient
  .metadata({ actionName: "admin.sendBackPostCard" })
  .inputSchema(sendBackSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const card = await db.postCard.findUniqueOrThrow({
      where: { id: parsedInput.postCardId },
    });

    if (card.approvalId) {
      await db.approvalRequest.updateMany({
        where: {
          id: card.approvalId,
          status: { in: ["pending", "approved"] },
        },
        data: { status: "expired" },
      });
    }

    await db.postCard.update({
      where: { id: card.id },
      data: {
        approvalId: null,
        status: ContentState.changesRequested,
      },
    });
    await db.contentAsset.update({
      where: { id: card.assetId },
      data: { state: ContentState.changesRequested },
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "content.send_back",
        entityType: "PostCard",
        entityId: card.id,
        meta: {
          reason: parsedInput.reason,
          note: parsedInput.note ?? null,
        },
      },
    });

    return { ok: true as const, reason: parsedInput.reason };
  });

const rejectSchema = z.object({
  postCardId: z.string().min(1),
  reason: z.enum(SEND_BACK_REASONS),
  note: z.string().max(500).optional(),
});

export const rejectPostCardAction = actionClient
  .metadata({ actionName: "admin.rejectPostCard" })
  .inputSchema(rejectSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const card = await db.postCard.findUniqueOrThrow({
      where: { id: parsedInput.postCardId },
    });

    if (card.approvalId) {
      await db.approvalRequest.updateMany({
        where: { id: card.approvalId, status: "pending" },
        data: { status: "rejected", rejectedAt: new Date() },
      });
    }

    await db.postCard.update({
      where: { id: card.id },
      data: {
        approvalId: null,
        status: ContentState.failed,
      },
    });
    await db.contentAsset.update({
      where: { id: card.assetId },
      data: { state: ContentState.failed },
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "content.reject",
        entityType: "PostCard",
        entityId: card.id,
        meta: {
          reason: parsedInput.reason,
          note: parsedInput.note ?? null,
        },
      },
    });

    return { ok: true as const, reason: parsedInput.reason };
  });

const updateSchema = z.object({
  postCardId: z.string().min(1),
  caption: z.string().max(2200).optional(),
  account: z.string().min(1).max(80).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const updatePostCardAction = actionClient
  .metadata({ actionName: "admin.updatePostCard" })
  .inputSchema(updateSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    const { voided } = await updatePostCardFields(
      parsedInput.postCardId,
      session.user.email,
      {
        caption: parsedInput.caption,
        account: parsedInput.account,
        scheduledAt:
          parsedInput.scheduledAt === undefined
            ? undefined
            : parsedInput.scheduledAt === null
              ? null
              : new Date(parsedInput.scheduledAt),
      },
    );
    return { voided };
  });

const batchSchema = z.object({
  postCardIds: z.array(z.string().min(1)).min(1).max(40),
  batchName: z.string().min(1).max(120).optional(),
});

export const batchApproveContentAction = actionClient
  .metadata({ actionName: "admin.batchApproveContent" })
  .inputSchema(batchSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const batchName =
      parsedInput.batchName?.trim() ||
      `Batch ${new Date().toISOString().slice(0, 16)}`;

    const approved: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const postCardId of parsedInput.postCardIds) {
      try {
        const { approvalId } = await createContentApprovalForCard({
          postCardId,
          actor: session.user.email,
        });
        await approveAndExecute(approvalId, session.user.email);
        approved.push(postCardId);
      } catch (cause) {
        skipped.push({
          id: postCardId,
          reason: cause instanceof Error ? cause.message : "failed",
        });
      }
    }

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "content.batch_approve",
        meta: { batchName, approved, skipped },
      },
    });

    return { batchName, approved, skipped };
  });
