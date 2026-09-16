import "server-only";

import { db } from "@/db";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { env } from "@/env";

function dubaiHour() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value ?? 12);
}

/** Quiet hours: 23:00–06:30 Dubai — only P1 wakes. */
function inQuietHours() {
  const hour = dubaiHour();
  return hour >= 23 || hour < 7;
}

export async function evaluateAlertRules() {
  const thresholds = await db.alertThreshold.findMany({
    where: { enabled: true },
  });
  const byRule = Object.fromEntries(thresholds.map((t) => [t.ruleId, t]));

  const stockThreshold = byRule.ST1?.value ?? 30;
  const lowStock = await db.stockItem.findMany({
    where: { daysOfCover: { lt: stockThreshold } },
  });

  for (const item of lowStock) {
    const threadKey = `STOCK-${item.sku}`;
    const existing = await db.alert.findFirst({
      where: { threadKey, status: { in: ["open", "acknowledged"] } },
    });
    if (existing) continue;

    const alert = await db.alert.create({
      data: {
        ruleId: "ST1",
        severity: "p2",
        title: `${item.title} at ${item.daysOfCover?.toFixed(0)} days of cover`,
        payload: { sku: item.sku, daysOfCover: item.daysOfCover },
        threadKey,
      },
    });

    if (env.TELEGRAM_KANE_CHAT_ID && !inQuietHours()) {
      await sendTelegramMessage({
        chatId: env.TELEGRAM_KANE_CHAT_ID,
        text: `P2 ST1 · ${alert.title}`,
      });
    }
  }

  const replyWindowMin = byRule.L1?.value ?? 60;
  const cutoff = new Date(Date.now() - replyWindowMin * 60_000);
  const unanswered = await db.leadThread.findMany({
    where: {
      highIntent: true,
      lastReplyAt: null,
      lastInboundAt: { lte: cutoff },
    },
  });

  for (const thread of unanswered) {
    const threadKey = `L1-${thread.channel}-${thread.externalId}`;
    const existing = await db.alert.findFirst({
      where: { threadKey, status: { in: ["open", "acknowledged"] } },
    });
    if (existing) continue;

    const alert = await db.alert.create({
      data: {
        ruleId: "L1",
        severity: "p1",
        title: `High-intent ${thread.channel} unanswered: ${thread.snippet ?? thread.externalId}`,
        payload: { threadId: thread.id },
        threadKey,
      },
    });

    if (env.TELEGRAM_KANE_CHAT_ID) {
      await sendTelegramMessage({
        chatId: env.TELEGRAM_KANE_CHAT_ID,
        text: `P1 L1 · ${alert.title}`,
      });
    }
  }

  return {
    stockAlerts: lowStock.length,
    dmAlerts: unanswered.length,
  };
}
