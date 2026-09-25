import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";

/**
 * Part 07 §7.4 — any change to caption, account or scheduled time after
 * approval voids that approval and returns the card to awaiting Kane.
 */
export async function voidPostCardApprovalOnEdit(
  postCardId: string,
  actor: string,
  reason: string,
) {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
  });

  if (!card.approvalId && card.status === ContentState.awaitingKane) {
    return { voided: false as const, id: card.id };
  }

  const updated = await db.postCard.update({
    where: { id: postCardId },
    data: {
      approvalId: null,
      status: ContentState.awaitingKane,
    },
  });

  await db.contentAsset.update({
    where: { id: card.assetId },
    data: { state: ContentState.awaitingKane },
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

  await db.auditLog.create({
    data: {
      actor,
      action: "content.void_approval",
      entityType: "PostCard",
      entityId: postCardId,
      meta: {
        reason,
        previousApprovalId: card.approvalId,
        previousStatus: card.status,
      },
    },
  });

  return { voided: true as const, id: updated.id };
}

/**
 * Update caption / account / scheduledAt; voids approval when any change.
 */
export async function updatePostCardFields(
  postCardId: string,
  actor: string,
  patch: {
    caption?: string | null;
    account?: string;
    scheduledAt?: Date | null;
  },
) {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
  });

  const captionChanged =
    patch.caption !== undefined && patch.caption !== card.caption;
  const accountChanged =
    patch.account !== undefined && patch.account !== card.account;
  const scheduledChanged =
    patch.scheduledAt !== undefined &&
    (patch.scheduledAt?.getTime() ?? null) !==
      (card.scheduledAt?.getTime() ?? null);

  const data: {
    caption?: string | null;
    account?: string;
    scheduledAt?: Date | null;
    approvalId?: null;
    status?: typeof ContentState.awaitingKane;
  } = {};

  if (patch.caption !== undefined) data.caption = patch.caption;
  if (patch.account !== undefined) data.account = patch.account;
  if (patch.scheduledAt !== undefined) data.scheduledAt = patch.scheduledAt;

  const shouldVoid = captionChanged || accountChanged || scheduledChanged;

  if (shouldVoid) {
    data.approvalId = null;
    data.status = ContentState.awaitingKane;
  }

  const updated = await db.postCard.update({
    where: { id: postCardId },
    data,
  });

  if (shouldVoid) {
    await db.contentAsset.update({
      where: { id: card.assetId },
      data: { state: ContentState.awaitingKane },
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
    await db.auditLog.create({
      data: {
        actor,
        action: "content.void_approval",
        entityType: "PostCard",
        entityId: postCardId,
        meta: {
          reason: [
            captionChanged ? "caption" : null,
            accountChanged ? "account" : null,
            scheduledChanged ? "scheduledAt" : null,
          ]
            .filter(Boolean)
            .join(","),
          previousApprovalId: card.approvalId,
        },
      },
    });
  }

  return { card: updated, voided: shouldVoid };
}
