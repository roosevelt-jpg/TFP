import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";
import { isAllPostingPaused, autoPauseAfterConsecutivePublishFails } from "@/lib/content/ops";
import { instagramAdapter } from "@/lib/content/adapters/instagram";
import { tiktokAdapter } from "@/lib/content/adapters/tiktok";
import { youtubeAdapter } from "@/lib/content/adapters/youtube";
import type {
  AdapterPostCard,
  PublishAdapter,
  PublishAdapterResult,
} from "@/lib/content/adapters/types";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

type PublishResult = {
  postUrl: string;
  privateUntilAudit: boolean;
  platform: string;
  published: boolean;
  error?: string;
};

export function getPublishAdapter(platform: string): PublishAdapter | null {
  const p = platform.toLowerCase();
  if (p.includes("instagram") || p === "ig") return instagramAdapter;
  if (p.includes("tiktok")) return tiktokAdapter;
  if (p.includes("youtube") || p.includes("shorts")) return youtubeAdapter;
  return null;
}

function toAdapterCard(card: {
  id: string;
  platform: string;
  account: string;
  caption: string | null;
  coverUrl: string | null;
  postUrl: string | null;
  mimeType?: string | null;
}): AdapterPostCard {
  return {
    id: card.id,
    platform: card.platform,
    account: card.account,
    caption: card.caption,
    coverUrl: card.coverUrl,
    postUrl: card.postUrl,
    mimeType: card.mimeType,
  };
}

async function markScheduled(
  cardId: string,
  assetId: string,
  postUrl: string,
  meta: Prisma.InputJsonValue,
) {
  await db.postCard.update({
    where: { id: cardId },
    data: {
      status: ContentState.scheduled,
      postUrl,
      scheduledAt: new Date(),
    },
  });
  await db.contentAsset.update({
    where: { id: assetId },
    data: { state: ContentState.scheduled },
  });
  await db.auditLog.create({
    data: {
      actor: "publisher",
      action: "content.publish",
      entityType: "PostCard",
      entityId: cardId,
      meta,
    },
  });
}

async function markFailed(
  cardId: string,
  assetId: string,
  reason: string,
  platform: string,
  account: string,
) {
  await db.postCard.update({
    where: { id: cardId },
    data: { status: ContentState.failed },
  });
  await db.contentAsset.update({
    where: { id: assetId },
    data: { state: ContentState.failed },
  });
  await db.auditLog.create({
    data: {
      actor: "publisher",
      action: "content.publish.failed",
      entityType: "PostCard",
      entityId: cardId,
      meta: { reason, platform, account },
    },
  });

  await autoPauseAfterConsecutivePublishFails(platform, account);
}

/** Publish an approved post card after Kane approval. */
export async function publishPostCard(postCardId: string): Promise<PublishResult> {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
    include: { asset: true },
  });

  if (card.held) {
    throw new Error("Post card is held — cron skips until released");
  }

  if (!card.compliancePass) {
    throw new Error("Cannot publish compliance failure");
  }

  const approval = card.approvalId
    ? await db.approvalRequest.findUnique({ where: { id: card.approvalId } })
    : null;

  // "approved" is allowed during executeApprovedAction (status flips to
  // executed after dispatch). Cron runs against already-executed approvals.
  if (
    !approval ||
    (approval.status !== "executed" && approval.status !== "approved")
  ) {
    throw new Error("Post requires an executed Kane approval");
  }

  if (await isAllPostingPaused()) {
    throw new Error("All posting paused");
  }

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

  const adapter = getPublishAdapter(card.platform);
  const adapterCard = toAdapterCard({
    ...card,
    mimeType: card.asset?.mimeType ?? null,
  });

  let result: PublishAdapterResult;
  try {
    if (adapter) {
      result = await adapter.publish(adapterCard);
      if (result.published) {
        const verified = await adapter.verify({
          ...adapterCard,
          postUrl: result.url,
        });
        if (!verified.ok) {
          logger.warn("Publish verify failed; holding as scheduled", {
            platform: card.platform,
            error: verified.error,
          });
          result = {
            ...result,
            published: false,
            url: verified.url ?? result.url,
            error: verified.error ?? result.error,
          };
        } else if (verified.url) {
          result = { ...result, url: verified.url };
        }
      }
    } else {
      result = {
        url: `https://train.theformulaperformance.com/admin/content?preview=${card.id}`,
        published: false,
        error: `No publish adapter for platform ${card.platform}`,
      };
    }
  } catch (error) {
    logger.error("Platform publish failed; marking failed for re-approval", error);
    const reason = error instanceof Error ? error.message : "publish_error";
    await markFailed(card.id, card.assetId, reason, card.platform, card.account);
    return {
      postUrl: `https://train.theformulaperformance.com/admin/content?preview=${card.id}`,
      privateUntilAudit: true,
      platform: card.platform,
      published: false,
      error: reason,
    };
  }

  // Missing tokens / pre-audit: stay scheduled (private), not failed.
  const privateUntilAudit = !result.published;
  if (result.error) {
    logger.info("Publish held private / pending", {
      platform: card.platform,
      error: result.error,
    });
  }

  await markScheduled(card.id, card.assetId, result.url, {
    platform: card.platform,
    privateUntilAudit,
    published: result.published,
    adapterError: result.error ?? null,
    externalId: result.externalId ?? null,
  });

  if (result.published) {
    await db.postCard.update({
      where: { id: card.id },
      data: { status: ContentState.published },
    });
    await db.contentAsset.update({
      where: { id: card.assetId },
      data: { state: ContentState.published },
    });
  }

  return {
    postUrl: result.url,
    privateUntilAudit,
    platform: card.platform,
    published: result.published,
    error: result.error,
  };
}

/**
 * Slot publisher: due scheduled/ready cards with compliance + Kane approval,
 * skipping held cards and the pause-all kill switch.
 */
export async function publishDuePostCards(limit = 20): Promise<{
  attempted: number;
  published: number;
  skippedPaused: boolean;
  results: Array<{
    postCardId: string;
    ok: boolean;
    published?: boolean;
    error?: string;
  }>;
}> {
  if (await isAllPostingPaused()) {
    logger.info("publishDuePostCards skipped — all posting paused");
    return {
      attempted: 0,
      published: 0,
      skippedPaused: true,
      results: [],
    };
  }

  const now = new Date();
  const due = await db.postCard.findMany({
    where: {
      held: false,
      compliancePass: true,
      status: { in: [ContentState.scheduled, ContentState.ready] },
      scheduledAt: { lte: now },
      approvalId: { not: null },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const results: Array<{
    postCardId: string;
    ok: boolean;
    published?: boolean;
    error?: string;
  }> = [];
  let published = 0;

  for (const card of due) {
    try {
      const result = await publishPostCard(card.id);
      if (result.published) published += 1;
      results.push({
        postCardId: card.id,
        ok: true,
        published: result.published,
        error: result.error,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "publish_error";
      logger.warn("publishDuePostCards item failed", {
        postCardId: card.id,
        error: message,
      });
      results.push({ postCardId: card.id, ok: false, error: message });
    }
  }

  return {
    attempted: due.length,
    published,
    skippedPaused: false,
    results,
  };
}

/**
 * Mark a Kane-approved post card as scheduled for its slot (cron publishes).
 */
export async function scheduleApprovedPostCard(
  postCardId: string,
  approvalId: string,
): Promise<{ scheduledAt: Date | null }> {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
    include: { asset: true },
  });

  if (!card.compliancePass) {
    throw new Error("Cannot schedule a compliance failure");
  }
  if (card.held) {
    throw new Error("Post card is held");
  }

  const scheduledAt = card.scheduledAt ?? new Date();

  await db.postCard.update({
    where: { id: postCardId },
    data: {
      status: ContentState.scheduled,
      approvalId,
      scheduledAt,
    },
  });
  await db.contentAsset.update({
    where: { id: card.assetId },
    data: { state: ContentState.scheduled },
  });
  await db.auditLog.create({
    data: {
      actor: "approvals",
      action: "content.schedule",
      entityType: "PostCard",
      entityId: postCardId,
      meta: { approvalId, scheduledAt },
    },
  });

  return { scheduledAt };
}
