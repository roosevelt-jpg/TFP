import "server-only";

import { db } from "@/db";
import { pullMetricsForPostCard } from "@/lib/content/metrics-pull";
import { ContentState } from "@/lib/content/states";

/** True when every channel is paused (pause-all kill switch). */
export async function isAllPostingPaused(): Promise<boolean> {
  const total = await db.channel.count();
  if (total === 0) return false;
  const unpaused = await db.channel.count({ where: { paused: false } });
  return unpaused === 0;
}

export async function pauseAllPosting(actor: string) {
  const channels = await db.channel.updateMany({
    data: { paused: true },
  });

  const scheduled = await db.postCard.updateMany({
    where: { status: ContentState.scheduled },
    data: { status: ContentState.awaitingKane },
  });

  await db.auditLog.create({
    data: {
      actor,
      action: "content.pause_all",
      meta: { channels: channels.count, unscheduled: scheduled.count },
    },
  });

  return { channels: channels.count, unscheduled: scheduled.count };
}

export async function holdPostCard(postCardId: string, actor: string) {
  const card = await db.postCard.update({
    where: { id: postCardId },
    data: { held: true },
  });

  await db.auditLog.create({
    data: {
      actor,
      action: "content.hold",
      entityType: "PostCard",
      entityId: postCardId,
      meta: { status: card.status, scheduledAt: card.scheduledAt },
    },
  });

  return { id: card.id, held: true as const };
}

export async function releasePostCard(postCardId: string, actor: string) {
  const card = await db.postCard.update({
    where: { id: postCardId },
    data: { held: false },
  });

  await db.auditLog.create({
    data: {
      actor,
      action: "content.release",
      entityType: "PostCard",
      entityId: postCardId,
      meta: { status: card.status, scheduledAt: card.scheduledAt },
    },
  });

  return { id: card.id, held: false as const };
}

export async function pauseAccount(
  platform: string,
  account: string,
  actor: string,
) {
  await db.channel.upsert({
    where: { platform_account: { platform, account } },
    create: {
      platform,
      account,
      paused: true,
      approvalMode: "every_post",
    },
    update: { paused: true },
  });

  const scheduled = await db.postCard.updateMany({
    where: { platform, account, status: ContentState.scheduled },
    data: { status: ContentState.awaitingKane },
  });

  await db.auditLog.create({
    data: {
      actor,
      action: "content.pause_account",
      meta: { platform, account, unscheduled: scheduled.count },
    },
  });

  return { unscheduled: scheduled.count };
}

/**
 * Part 07 §7.6 — auto-pause on CT7 / CT10 / two consecutive publish failures.
 */
export async function maybeAutoPauseAccount(input: {
  platform: string;
  account: string;
  reason: "CT7" | "CT10" | "publish_fail_x2";
}) {
  const result = await pauseAccount(
    input.platform,
    input.account,
    `system:auto-pause:${input.reason}`,
  );
  await db.auditLog.create({
    data: {
      actor: `system:auto-pause:${input.reason}`,
      action: "content.auto_pause",
      meta: {
        platform: input.platform,
        account: input.account,
        reason: input.reason,
        unscheduled: result.unscheduled,
      },
    },
  });
  return result;
}

/**
 * After a publish failure, pause the account if the last two failures for
 * this platform/account are consecutive (no successful publish between).
 */
export async function autoPauseAfterConsecutivePublishFails(
  platform: string,
  account: string,
) {
  const recent = await db.auditLog.findMany({
    where: {
      OR: [
        { action: "content.publish.failed" },
        { action: "content.publish" },
      ],
      meta: {
        path: ["platform"],
        equals: platform,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Filter to this account via meta when present; fall back to post-card lookup.
  const forAccount: Array<{ action: string }> = [];
  for (const row of recent) {
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {};
    if (meta.account && meta.account !== account) continue;
    if (meta.platform && meta.platform !== platform) continue;
    forAccount.push({ action: row.action });
    if (forAccount.length >= 2) break;
  }

  if (
    forAccount.length >= 2 &&
    forAccount[0]?.action === "content.publish.failed" &&
    forAccount[1]?.action === "content.publish.failed"
  ) {
    return maybeAutoPauseAccount({
      platform,
      account,
      reason: "publish_fail_x2",
    });
  }

  // Fallback: two most recent failed PostCards for this account with no
  // published card newer than the older failure.
  const fails = await db.postCard.findMany({
    where: {
      platform,
      account,
      status: { in: [ContentState.failed, "failed", "rejected"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 2,
  });
  if (fails.length < 2) return null;
  const newerOk = await db.postCard.findFirst({
    where: {
      platform,
      account,
      status: { in: [ContentState.published, "published", "posted"] },
      updatedAt: { gt: fails[1]!.updatedAt },
    },
  });
  if (newerOk) return null;
  return maybeAutoPauseAccount({
    platform,
    account,
    reason: "publish_fail_x2",
  });
}

export async function pullPostMetrics(postCardId: string) {
  return pullMetricsForPostCard(postCardId);
}
