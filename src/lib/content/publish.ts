import "server-only";

import { db } from "@/db";
import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

type PublishResult = {
  postUrl: string;
  privateUntilAudit: boolean;
  platform: string;
  published: boolean;
};

async function markScheduled(
  cardId: string,
  assetId: string,
  postUrl: string,
  meta: Prisma.InputJsonValue,
) {
  await db.postCard.update({
    where: { id: cardId },
    data: {
      status: "scheduled",
      postUrl,
      scheduledAt: new Date(),
    },
  });
  await db.contentAsset.update({
    where: { id: assetId },
    data: { state: "scheduled" },
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

async function publishInstagram(input: {
  caption: string;
  mediaUrl?: string | null;
  account: string;
}): Promise<{ url: string; published: boolean }> {
  const token =
    (await resolveSecret("META_PAGE_ACCESS_TOKEN")) ??
    (await resolveSecret("META_ACCESS_TOKEN")) ??
    process.env.META_PAGE_ACCESS_TOKEN ??
    process.env.META_ACCESS_TOKEN;
  const igUserId =
    (await resolveSecret("META_INSTAGRAM_ACCOUNT_ID")) ??
    process.env.META_INSTAGRAM_ACCOUNT_ID;

  if (!token || !igUserId || !input.mediaUrl) {
    return {
      url: `https://www.instagram.com/${input.account}/`,
      published: false,
    };
  }

  // Container → publish (Graph API). Private/credential-gated until token live.
  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: input.mediaUrl,
        caption: input.caption,
        access_token: token,
      }),
    },
  );
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Instagram media create failed: ${createRes.status} ${body}`);
  }
  const created = (await createRes.json()) as { id?: string };
  if (!created.id) throw new Error("Instagram media id missing");

  const pubRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: created.id, access_token: token }),
    },
  );
  if (!pubRes.ok) {
    const body = await pubRes.text();
    throw new Error(`Instagram publish failed: ${pubRes.status} ${body}`);
  }
  const published = (await pubRes.json()) as { id?: string };
  return {
    url: `https://www.instagram.com/p/${published.id ?? created.id}/`,
    published: true,
  };
}

async function publishTikTok(input: {
  caption: string;
  account: string;
}): Promise<{ url: string; published: boolean }> {
  const token =
    (await resolveSecret("TIKTOK_ACCESS_TOKEN")) ??
    process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    return {
      url: `https://www.tiktok.com/@${input.account}`,
      published: false,
    };
  }
  // Token present but Content Posting API requires audited app — schedule private.
  logger.info("TikTok token present; posting private until audit", {
    account: input.account,
  });
  return {
    url: `https://www.tiktok.com/@${input.account}`,
    published: false,
  };
}

async function publishYouTube(input: {
  caption: string;
  account: string;
}): Promise<{ url: string; published: boolean }> {
  const token =
    (await resolveSecret("YOUTUBE_ACCESS_TOKEN")) ??
    process.env.YOUTUBE_ACCESS_TOKEN;
  if (!token) {
    return {
      url: `https://www.youtube.com/@${input.account}`,
      published: false,
    };
  }
  logger.info("YouTube token present; upload private until audit", {
    account: input.account,
  });
  return {
    url: `https://www.youtube.com/@${input.account}`,
    published: false,
  };
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

  const platform = card.platform.toLowerCase();
  const caption = card.caption ?? card.asset.title ?? "";
  const mediaUrl = card.coverUrl ?? null;

  let result: { url: string; published: boolean };
  try {
    if (platform.includes("instagram") || platform === "ig") {
      result = await publishInstagram({
        caption,
        mediaUrl,
        account: card.account,
      });
    } else if (platform.includes("tiktok")) {
      result = await publishTikTok({ caption, account: card.account });
    } else if (platform.includes("youtube") || platform.includes("shorts")) {
      result = await publishYouTube({ caption, account: card.account });
    } else {
      result = {
        url: `https://train.theformulaperformance.com/admin/content?preview=${card.id}`,
        published: false,
      };
    }
  } catch (error) {
    logger.error("Platform publish failed; keeping private preview", error);
    result = {
      url: `https://train.theformulaperformance.com/admin/content?preview=${card.id}`,
      published: false,
    };
  }

  const privateUntilAudit = !result.published;
  await markScheduled(card.id, card.assetId, result.url, {
    platform: card.platform,
    privateUntilAudit,
    published: result.published,
  });

  if (result.published) {
    await db.postCard.update({
      where: { id: card.id },
      data: { status: "posted" },
    });
    await db.contentAsset.update({
      where: { id: card.assetId },
      data: { state: "posted" },
    });
  }

  return {
    postUrl: result.url,
    privateUntilAudit,
    platform: card.platform,
    published: result.published,
  };
}
