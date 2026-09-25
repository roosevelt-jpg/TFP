import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";
import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";

export type MetricsPullResult = {
  postCardId: string;
  checkpoint: string;
  source: "ig_insights" | "placeholder";
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

/** Best-effort extract of an IG media id from a stored post URL. */
export function extractMediaIdFromPostUrl(
  postUrl: string | null | undefined,
): string | null {
  if (!postUrl) return null;
  try {
    const u = new URL(postUrl);
    const mediaParam =
      u.searchParams.get("media_id") ?? u.searchParams.get("id");
    if (mediaParam && /^\d+$/.test(mediaParam)) return mediaParam;

    // Graph publish often stores …/p/<numericId>/
    const parts = u.pathname.split("/").filter(Boolean);
    const pIdx = parts.indexOf("p");
    if (pIdx >= 0 && parts[pIdx + 1] && /^\d+$/.test(parts[pIdx + 1]!)) {
      return parts[pIdx + 1]!;
    }
    // Fallback: any long numeric path segment
    for (const part of parts) {
      if (/^\d{10,}$/.test(part)) return part;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchIgInsights(mediaId: string, token: string) {
  const metrics = [
    "impressions",
    "reach",
    "likes",
    "comments",
    "shares",
    "saved",
    "plays",
  ].join(",");
  const url = `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=${metrics}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`IG insights ${res.status}: ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
  };
  const byName = new Map<string, number>();
  for (const row of json.data ?? []) {
    if (!row.name) continue;
    byName.set(row.name, Number(row.values?.[0]?.value ?? 0));
  }
  return {
    views: byName.get("plays") ?? byName.get("impressions") ?? byName.get("reach") ?? 0,
    likes: byName.get("likes") ?? 0,
    comments: byName.get("comments") ?? 0,
    shares: byName.get("shares") ?? byName.get("saved") ?? 0,
  };
}

/**
 * Stamp a PostMetric row for one published PostCard.
 * Tries IG Graph insights when META token + media id are available;
 * otherwise writes a zeroed placeholder checkpoint labelled `placeholder`.
 */
export async function pullMetricsForPostCard(
  postCardId: string,
): Promise<MetricsPullResult> {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
  });

  const token =
    (await resolveSecret("META_PAGE_ACCESS_TOKEN")) ??
    (await resolveSecret("META_ACCESS_TOKEN"));
  const mediaId = extractMediaIdFromPostUrl(card.postUrl);
  const platform = card.platform.toLowerCase();
  const isIg = platform.includes("instagram") || platform === "ig";

  if (token && mediaId && isIg) {
    try {
      const insights = await fetchIgInsights(mediaId, token);
      const checkpoint = "ig_insights";
      await db.postMetric.upsert({
        where: {
          postCardId_checkpoint: { postCardId: card.id, checkpoint },
        },
        create: {
          postCardId: card.id,
          checkpoint,
          ...insights,
        },
        update: {
          ...insights,
          capturedAt: new Date(),
        },
      });
      return {
        postCardId: card.id,
        checkpoint,
        source: "ig_insights",
        ...insights,
      };
    } catch (error) {
      logger.warn("IG insights pull failed; writing placeholder", {
        postCardId: card.id,
        message: error instanceof Error ? error.message : "failed",
      });
    }
  }

  const checkpoint = "placeholder";
  await db.postMetric.upsert({
    where: {
      postCardId_checkpoint: { postCardId: card.id, checkpoint },
    },
    create: {
      postCardId: card.id,
      checkpoint,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    },
    update: { capturedAt: new Date() },
  });

  return {
    postCardId: card.id,
    checkpoint,
    source: "placeholder",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  };
}

/**
 * Daily batch: published PostCards that have a postUrl.
 * Best-effort — continues past per-card failures.
 */
export async function pullPublishedPostMetrics(opts?: {
  limit?: number;
}): Promise<{ pulled: number; ig: number; placeholder: number }> {
  const cards = await db.postCard.findMany({
    where: {
      status: { in: [ContentState.published, "posted"] },
      postUrl: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    take: opts?.limit ?? 200,
    select: { id: true },
  });

  let pulled = 0;
  let ig = 0;
  let placeholder = 0;

  for (const card of cards) {
    try {
      const result = await pullMetricsForPostCard(card.id);
      pulled += 1;
      if (result.source === "ig_insights") ig += 1;
      else placeholder += 1;
    } catch (error) {
      logger.warn("Post metrics pull skipped card", {
        postCardId: card.id,
        message: error instanceof Error ? error.message : "failed",
      });
    }
  }

  return { pulled, ig, placeholder };
}
