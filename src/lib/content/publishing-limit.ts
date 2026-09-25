import "server-only";

import { db } from "@/db";
import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";

/**
 * Best-effort Instagram Graph `content_publishing_limit` → Channel.publishingLimit.
 * Skips cleanly when META secrets / IG user id are missing (CT9 already reads the field).
 */
export async function pullInstagramPublishingLimits(): Promise<{
  updated: number;
  skipped: boolean;
  reason?: string;
}> {
  const token =
    (await resolveSecret("META_PAGE_ACCESS_TOKEN")) ??
    (await resolveSecret("META_ACCESS_TOKEN")) ??
    process.env.META_PAGE_ACCESS_TOKEN ??
    process.env.META_ACCESS_TOKEN;
  const igUserId =
    (await resolveSecret("META_INSTAGRAM_ACCOUNT_ID")) ??
    process.env.META_INSTAGRAM_ACCOUNT_ID;

  if (!token || !igUserId) {
    return {
      updated: 0,
      skipped: true,
      reason: "META_PAGE_ACCESS_TOKEN / META_INSTAGRAM_ACCOUNT_ID missing",
    };
  }

  const url = `https://graph.facebook.com/v21.0/${igUserId}/content_publishing_limit?fields=quota_usage,config&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn("content_publishing_limit pull failed", {
      status: res.status,
      body: body.slice(0, 160),
    });
    return {
      updated: 0,
      skipped: true,
      reason: `Graph HTTP ${res.status}`,
    };
  }

  const json = (await res.json()) as {
    data?: Array<{
      quota_usage?: number;
      config?: { quota_total?: number; quota_duration?: number };
    }>;
  };
  const row = json.data?.[0];
  const quotaTotal = row?.config?.quota_total;
  if (quotaTotal == null || !Number.isFinite(quotaTotal)) {
    return {
      updated: 0,
      skipped: true,
      reason: "quota_total missing in Graph response",
    };
  }

  const account =
    (await resolveSecret("META_INSTAGRAM_ACCOUNT_HANDLE")) ??
    process.env.META_INSTAGRAM_ACCOUNT_HANDLE ??
    "@theformulaperformance";

  await db.channel.upsert({
    where: {
      platform_account: { platform: "instagram", account },
    },
    create: {
      platform: "instagram",
      account,
      publishingLimit: Math.round(quotaTotal),
      brand: "TFP",
    },
    update: {
      publishingLimit: Math.round(quotaTotal),
    },
  });

  // Also refresh any other IG channels with a known limit pattern
  const otherIg = await db.channel.findMany({
    where: { platform: { contains: "instagram", mode: "insensitive" } },
    select: { id: true, account: true },
  });
  let updated = 1;
  for (const ch of otherIg) {
    if (ch.account === account) continue;
    // Same app-level quota often applies — stamp best-effort
    await db.channel.update({
      where: { id: ch.id },
      data: { publishingLimit: Math.round(quotaTotal) },
    });
    updated += 1;
  }

  await db.auditLog.create({
    data: {
      actor: "connectors",
      action: "content.publishing_limit_pull",
      meta: {
        quotaTotal,
        quotaUsage: row?.quota_usage ?? null,
        updated,
      },
    },
  });

  return { updated, skipped: false };
}
