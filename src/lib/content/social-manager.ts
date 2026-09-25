import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

/**
 * Social media manager agent — plans only. No publish tool.
 */
export async function buildMondayContentPlan() {
  const pendingCards = await db.postCard.findMany({
    where: {
      status: {
        in: [ContentState.awaitingKane, "awaiting_kane", ContentState.draft],
      },
    },
    include: { asset: true },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });

  const complianceFails = await db.postCard.findMany({
    where: {
      OR: [
        { compliancePass: false },
        {
          status: {
            in: [
              ContentState.failed,
              "rejected",
              ContentState.compliance,
              ContentState.changesRequested,
            ],
          },
        },
        {
          asset: {
            state: {
              in: [ContentState.compliance, ContentState.changesRequested],
            },
          },
        },
      ],
    },
    include: { asset: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const scheduled = await db.postCard.findMany({
    where: {
      status: { in: [ContentState.scheduled, "scheduled"] },
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
    `Pending Kane cards: ${pendingCards.length}`,
    `Compliance fails: ${complianceFails.length}`,
    `Scheduled next 7d: ${scheduled.length}`,
    "",
    "<b>Pending post cards</b>",
    ...(pendingCards.length
      ? pendingCards.map(
          (c) =>
            `· ${c.platform}/${c.account} · ${c.asset.title} · ${c.status}`,
        )
      : ["· none"]),
    "",
    "<b>Compliance fails</b>",
    ...(complianceFails.length
      ? complianceFails.map(
          (c) =>
            `· ${c.asset.title} · ${c.complianceResult ?? c.status}`,
        )
      : ["· none"]),
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
      meta: {
        pending: pendingCards.length,
        complianceFails: complianceFails.length,
        scheduled: scheduled.length,
      },
    },
  });

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: pack,
    });
  }

  return {
    pack,
    awaiting: pendingCards.length,
    complianceFails: complianceFails.length,
    scheduled: scheduled.length,
  };
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

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text,
    });
  }

  return { text };
}
