import "server-only";

import { env } from "@/env";
import { db } from "@/db";

/**
 * Social media manager agent — plans only. No publish tool.
 */
export async function buildMondayContentPlan() {
  const awaiting = await db.postCard.count({
    where: { status: "awaiting_kane" },
  });
  const scheduled = await db.postCard.findMany({
    where: {
      status: "scheduled",
      scheduledAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 86_400_000),
      },
    },
    include: { asset: true },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });

  const pack = [
    "<b>Monday content plan pack</b>",
    `Awaiting Kane: ${awaiting}`,
    `Scheduled next 7d: ${scheduled.length}`,
    "",
    "<b>Filming shot list (Wed + Sun)</b>",
    "1. Gym cue — deadlift setup (vertical)",
    "2. Kitchen — meal prep under 60s",
    "3. WhatsApp coach demo screen recording",
    "",
    "<b>Edit brief</b>",
    "Hook in 1.5s · captions burned · no hormone claims · end card TFP",
    "See docs/editor-knowledge-base.md",
    "",
    "<b>Slots proposed</b>",
    ...scheduled.map(
      (s) =>
        `· ${s.scheduledAt?.toISOString().slice(0, 16) ?? "unset"} · ${s.platform} · ${s.asset.title}`,
    ),
    "",
    "This agent cannot publish. Kane approves every post card.",
  ].join("\n");

  await db.auditLog.create({
    data: {
      actor: "social-media-manager",
      action: "content.monday_plan",
      meta: { awaiting, scheduled: scheduled.length },
    },
  });

  if (env.TELEGRAM_KANE_CHAT_ID) {
    const { sendTelegramMessage } = await import("@/lib/telegram/client");
    await sendTelegramMessage({
      chatId: env.TELEGRAM_KANE_CHAT_ID,
      text: pack,
    });
  }

  return { pack, awaiting, scheduled: scheduled.length };
}

export async function buildAffiliateMondayPrompt() {
  const lemoni = await db.kpiValue.findMany({
    where: { personKey: "lemoni" },
    orderBy: { date: "desc" },
    take: 6,
  });

  const text = [
    "<b>Monday reminder — affiliate management structure</b>",
    "Build / review the affiliate structure this week.",
    "",
    "<b>Lemoni scorecard (latest)</b>",
    ...lemoni.map((k) => `· ${k.kpiId}: ${k.value}`),
    "",
    "Attach decisions in Sunday 12:00 planning.",
  ].join("\n");

  if (env.TELEGRAM_KANE_CHAT_ID) {
    const { sendTelegramMessage } = await import("@/lib/telegram/client");
    await sendTelegramMessage({
      chatId: env.TELEGRAM_KANE_CHAT_ID,
      text,
    });
  }

  return { text };
}
