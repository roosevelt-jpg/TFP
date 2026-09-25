import "server-only";

import { db } from "@/db";
import { pullMetricsForPostCard } from "@/lib/content/metrics-pull";
import { ContentState } from "@/lib/content/states";

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

export async function pullPostMetrics(postCardId: string) {
  return pullMetricsForPostCard(postCardId);
}
