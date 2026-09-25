import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";
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
}): AdapterPostCard {
  return {
    id: card.id,
    platform: card.platform,
    account: card.account,
    caption: card.caption,
    coverUrl: card.coverUrl,
    postUrl: card.postUrl,
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
      meta: { reason },
    },
  });
}

/** Publish an approved post card after Kane approval. */
export async function publishPostCard(postCardId: string): Promise<PublishResult> {
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
  const adapterCard = toAdapterCard(card);

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
    await markFailed(card.id, card.assetId, reason);
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
