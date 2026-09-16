import "server-only";

import { db } from "@/db";

export async function pauseAllPosting(actor: string) {
  const channels = await db.channel.updateMany({
    data: { paused: true },
  });

  const scheduled = await db.postCard.updateMany({
    where: { status: "scheduled" },
    data: { status: "awaiting_kane" },
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
    where: { platform, account, status: "scheduled" },
    data: { status: "awaiting_kane" },
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
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
  });

  // Until platform audits complete, store a recorded checkpoint from the
  // last known post URL scrape placeholder — real Graph pulls land after audit.
  const checkpoint = "24h";
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

  return { checkpoint };
}
