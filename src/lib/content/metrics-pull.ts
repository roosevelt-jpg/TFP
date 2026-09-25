import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";
import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";

export type MetricsCheckpoint = "24h" | "72h" | "7d";

export type MetricsPullResult = {
  postCardId: string;
  checkpoint: MetricsCheckpoint | string;
  source:
    | "ig_insights"
    | "tt_stub"
    | "yt_stub"
    | "placeholder"
    | "skipped_no_secret";
  views: number;
  likes: number;
  comments: number;
  shares: number;
  label?: string;
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

/**
 * Pick the Part 07 performance checkpoint from hours since publish.
 * 24h → early; 72h → mid; 7d → mature.
 */
export function checkpointForAgeHours(hours: number): MetricsCheckpoint {
  if (hours < 48) return "24h";
  if (hours < 120) return "72h";
  return "7d";
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

async function writeMetric(
  postCardId: string,
  checkpoint: string,
  insights: { views: number; likes: number; comments: number; shares: number },
) {
  await db.postMetric.upsert({
    where: {
      postCardId_checkpoint: { postCardId, checkpoint },
    },
    create: {
      postCardId,
      checkpoint,
      ...insights,
    },
    update: {
      ...insights,
      capturedAt: new Date(),
    },
  });
}

/**
 * Stamp a PostMetric row for one published PostCard.
 * Checkpoints: 24h / 72h / 7d from publish age.
 * IG: Graph insights when token + media id available.
 * TT/YT: resolveSecret — skip with labelled placeholder when missing.
 */
export async function pullMetricsForPostCard(
  postCardId: string,
  opts?: { now?: Date },
): Promise<MetricsPullResult> {
  const now = opts?.now ?? new Date();
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
  });

  const publishedAt = card.scheduledAt ?? card.updatedAt;
  const ageHours = Math.max(
    0,
    (now.getTime() - publishedAt.getTime()) / 3_600_000,
  );
  const checkpoint = checkpointForAgeHours(ageHours);
  const platform = card.platform.toLowerCase();
  const isIg = platform.includes("instagram") || platform === "ig";
  const isTt = platform.includes("tiktok") || platform === "tt";
  const isYt =
    platform.includes("youtube") ||
    platform.includes("short") ||
    platform === "yt";

  // ── Instagram ──────────────────────────────────────────────────
  if (isIg) {
    const token =
      (await resolveSecret("META_PAGE_ACCESS_TOKEN")) ??
      (await resolveSecret("META_ACCESS_TOKEN"));
    const mediaId = extractMediaIdFromPostUrl(card.postUrl);

    if (token && mediaId) {
      try {
        const insights = await fetchIgInsights(mediaId, token);
        await writeMetric(card.id, checkpoint, insights);
        return {
          postCardId: card.id,
          checkpoint,
          source: "ig_insights",
          ...insights,
        };
      } catch (error) {
        logger.warn("IG insights pull failed; writing placeholder", {
          postCardId: card.id,
          checkpoint,
          message: error instanceof Error ? error.message : "failed",
        });
      }
    }

    const label = !token
      ? "placeholder · META token missing"
      : !mediaId
        ? "placeholder · media id not in postUrl"
        : "placeholder · ig insights failed";
    await writeMetric(card.id, checkpoint, {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    });
    return {
      postCardId: card.id,
      checkpoint,
      source: "placeholder",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      label,
    };
  }

  // ── TikTok stub ────────────────────────────────────────────────
  if (isTt) {
    const token =
      (await resolveSecret("TIKTOK_ACCESS_TOKEN")) ??
      process.env.TIKTOK_ACCESS_TOKEN;
    if (!token) {
      const labelled = `${checkpoint}_tt_secret_missing`;
      await writeMetric(card.id, labelled, {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      });
      return {
        postCardId: card.id,
        checkpoint: labelled,
        source: "skipped_no_secret",
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        label: "TikTok metrics skipped — TIKTOK_ACCESS_TOKEN missing",
      };
    }
    // Live TT insights not wired — labelled stub (not silent zeros-as-truth)
    const labelled = `${checkpoint}_tt_stub`;
    await writeMetric(card.id, labelled, {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    });
    return {
      postCardId: card.id,
      checkpoint: labelled,
      source: "tt_stub",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      label: "TikTok metrics placeholder — API stub",
    };
  }

  // ── YouTube / Shorts stub ──────────────────────────────────────
  if (isYt) {
    const token =
      (await resolveSecret("YOUTUBE_ACCESS_TOKEN")) ??
      process.env.YOUTUBE_ACCESS_TOKEN;
    if (!token) {
      const labelled = `${checkpoint}_yt_secret_missing`;
      await writeMetric(card.id, labelled, {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      });
      return {
        postCardId: card.id,
        checkpoint: labelled,
        source: "skipped_no_secret",
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        label: "YouTube metrics skipped — YOUTUBE_ACCESS_TOKEN missing",
      };
    }
    const labelled = `${checkpoint}_yt_stub`;
    await writeMetric(card.id, labelled, {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    });
    return {
      postCardId: card.id,
      checkpoint: labelled,
      source: "yt_stub",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      label: "YouTube metrics placeholder — API stub",
    };
  }

  // ── Unknown platform ───────────────────────────────────────────
  await writeMetric(card.id, checkpoint, {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  });
  return {
    postCardId: card.id,
    checkpoint,
    source: "placeholder",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    label: `placeholder · unsupported platform ${card.platform}`,
  };
}

/**
 * Daily batch: published PostCards that have a postUrl.
 * Best-effort — continues past per-card failures.
 */
export async function pullPublishedPostMetrics(opts?: {
  limit?: number;
}): Promise<{
  pulled: number;
  ig: number;
  placeholder: number;
  stubs: number;
  skipped: number;
}> {
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
  let stubs = 0;
  let skipped = 0;

  for (const card of cards) {
    try {
      const result = await pullMetricsForPostCard(card.id);
      pulled += 1;
      if (result.source === "ig_insights") ig += 1;
      else if (result.source === "tt_stub" || result.source === "yt_stub")
        stubs += 1;
      else if (result.source === "skipped_no_secret") skipped += 1;
      else placeholder += 1;
    } catch (error) {
      logger.warn("Post metrics pull skipped card", {
        postCardId: card.id,
        message: error instanceof Error ? error.message : "failed",
      });
    }
  }

  return { pulled, ig, placeholder, stubs, skipped };
}
