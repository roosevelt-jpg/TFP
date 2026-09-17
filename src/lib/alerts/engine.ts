import "server-only";

import { db } from "@/db";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import type { Prisma } from "@/generated/prisma/client";

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

async function fireAlert(input: {
  ruleId: string;
  severity: "p1" | "p2" | "p3";
  title: string;
  threadKey: string;
  payload?: Prisma.InputJsonValue;
  bypassQuiet?: boolean;
}) {
  const existing = await db.alert.findFirst({
    where: {
      threadKey: input.threadKey,
      status: { in: ["open", "acknowledged"] },
    },
  });
  if (existing) return null;

  const alert = await db.alert.create({
    data: {
      ruleId: input.ruleId,
      severity: input.severity,
      title: input.title,
      payload: input.payload ?? {},
      threadKey: input.threadKey,
    },
  });

  const kaneChatId = await getKaneTelegramChatId();
  const mayNotify =
    input.severity === "p1" || input.bypassQuiet || !inQuietHours();
  if (kaneChatId && mayNotify) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: `${input.severity.toUpperCase()} ${input.ruleId} · ${alert.title}`,
    });
  }
  return alert;
}

export async function evaluateAlertRules() {
  const thresholds = await db.alertThreshold.findMany({
    where: { enabled: true },
  });
  const byRule = Object.fromEntries(thresholds.map((t) => [t.ruleId, t]));

  // ST1 — stock cover
  const stockThreshold = byRule.ST1?.value ?? 30;
  const lowStock = await db.stockItem.findMany({
    where: { daysOfCover: { lt: stockThreshold } },
  });
  for (const item of lowStock) {
    await fireAlert({
      ruleId: "ST1",
      severity: "p2",
      title: `${item.title} at ${item.daysOfCover?.toFixed(0)} days of cover`,
      threadKey: `STOCK-${item.sku}`,
      payload: { sku: item.sku, daysOfCover: item.daysOfCover },
    });
  }

  // L1 — high-intent DM SLA
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
    await fireAlert({
      ruleId: "L1",
      severity: "p1",
      title: `High-intent ${thread.channel} unanswered: ${thread.snippet ?? thread.externalId}`,
      threadKey: `L1-${thread.channel}-${thread.externalId}`,
      payload: { threadId: thread.id },
      bypassQuiet: true,
    });
  }

  // PY2 — past_due subscriptions (payment failure)
  const pastDue = await db.subscription.findMany({
    where: { status: "past_due" },
    include: { customer: { select: { email: true, name: true } } },
    take: 40,
  });
  for (const sub of pastDue) {
    await fireAlert({
      ruleId: "PY2",
      severity: "p1",
      title: `Payment failed — ${sub.customer.name} (${sub.customer.email})`,
      threadKey: `PY2-${sub.stripeSubscriptionId}`,
      payload: { subscriptionId: sub.id },
      bypassQuiet: true,
    });
  }

  // R1 — connector errors
  const badRuns = await db.connectorRun.findMany({
    where: { status: "error" },
  });
  for (const run of badRuns) {
    await fireAlert({
      ruleId: "R1",
      severity: "p2",
      title: `Connector ${run.sourceId} (${run.name}) error: ${run.lastError ?? "unknown"}`,
      threadKey: `R1-${run.sourceId}`,
      payload: { sourceId: run.sourceId },
    });
  }

  // CA4 — Leah finance upload missing today (Dubai day)
  const dubaiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
  }).format(new Date());
  const financeToday = await db.financeTxn.count({
    where: {
      date: new Date(dubaiDate),
      uploadBatch: { startsWith: "leah-" },
    },
  });
  if (financeToday === 0 && dubaiHour() >= 13) {
    await fireAlert({
      ruleId: "CA4",
      severity: "p2",
      title: `Leah finance CSV missing for ${dubaiDate}`,
      threadKey: `CA4-${dubaiDate}`,
    });
  }

  // SY1 — open uptime alerts already created by uptime connector; escalate if many open
  const openUptime = await db.alert.count({
    where: {
      ruleId: { startsWith: "SY" },
      status: "open",
    },
  });
  if (openUptime >= 3) {
    await fireAlert({
      ruleId: "SY1",
      severity: "p1",
      title: `${openUptime} open system/uptime alerts`,
      threadKey: "SY1-cluster",
      bypassQuiet: true,
    });
  }

  // CL1 — no-shows today
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const noShows = await db.call.count({
    where: { outcome: "no_show", scheduledAt: { gte: start } },
  });
  if (noShows > 0) {
    await fireAlert({
      ruleId: "CL1",
      severity: "p2",
      title: `${noShows} call no-show(s) today`,
      threadKey: `CL1-${dubaiDate}`,
      payload: { noShows },
    });
  }

  // ON1 — incomplete onboarding > 24h
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const incomplete = await db.customer.count({
    where: {
      createdAt: { lte: dayAgo },
      coaching: { is: null },
      purchases: { some: { status: "paid" } },
    },
  });
  if (incomplete > 0) {
    await fireAlert({
      ruleId: "ON1",
      severity: "p2",
      title: `${incomplete} paid buyer(s) missing coaching profile >24h`,
      threadKey: `ON1-${dubaiDate}`,
    });
  }

  // CT1 — content cards stuck awaiting Kane > 48h
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const stuckContent = await db.contentAsset.count({
    where: {
      state: "awaiting_kane",
      updatedAt: { lte: twoDaysAgo },
    },
  });
  if (stuckContent > 0) {
    await fireAlert({
      ruleId: "CT1",
      severity: "p2",
      title: `${stuckContent} content asset(s) awaiting Kane >48h`,
      threadKey: `CT1-${dubaiDate}`,
    });
  }

  // M5 — Meta ad spend with zero purchases yesterday (if threshold set)
  const m5 = byRule.M5?.value ?? 0;
  if (m5 > 0) {
    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    y.setUTCHours(0, 0, 0, 0);
    const snap = await db.dailySnapshot.findUnique({ where: { date: y } });
    if (snap && snap.adSpendPence >= m5 * 100 && snap.revenuePence === 0) {
      await fireAlert({
        ruleId: "M5",
        severity: "p1",
        title: `Meta spend with zero revenue yesterday`,
        threadKey: `M5-${y.toISOString().slice(0, 10)}`,
        bypassQuiet: true,
      });
    }
  }

  return {
    stockAlerts: lowStock.length,
    dmAlerts: unanswered.length,
    pastDue: pastDue.length,
    connectorErrors: badRuns.length,
  };
}
