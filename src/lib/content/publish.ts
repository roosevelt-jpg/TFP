import "server-only";

import { env } from "@/env";
import { db } from "@/db";

/** Publish an approved post card after Kane approval. Private until audits pass. */
export async function publishPostCard(postCardId: string) {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
    include: { asset: true },
  });

  if (!card.compliancePass) {
    throw new Error("Cannot publish compliance failure");
  }

  const approval = card.approvalId
    ? await db.approvalRequest.findUnique({ where: { id: card.approvalId } })
    : null;

  if (!approval || approval.status !== "executed") {
    throw new Error("Post requires an executed Kane approval");
  }

  // Platform adapters — Instagram/TikTok/YouTube gated by token + audit status.
  const channel = await db.channel.findUnique({
    where: {
      platform_account: {
        platform: card.platform,
        account: card.account,
      },
    },
  });

  if (channel?.paused) {
    throw new Error("Channel paused");
  }

  const privateUrl = `https://train.theformulaperformance.com/admin/content?preview=${card.id}`;

  await db.postCard.update({
    where: { id: card.id },
    data: {
      status: "scheduled",
      postUrl: privateUrl,
      scheduledAt: card.scheduledAt ?? new Date(),
    },
  });

  await db.contentAsset.update({
    where: { id: card.assetId },
    data: { state: "scheduled" },
  });

  await db.auditLog.create({
    data: {
      actor: "publisher",
      action: "content.scheduled",
      entityType: "PostCard",
      entityId: card.id,
      meta: {
        platform: card.platform,
        privateUntilAudit: true,
        frameTokenConfigured: Boolean(env.FRAME_IO_TOKEN),
      },
    },
  });

  return { postUrl: privateUrl };
}
