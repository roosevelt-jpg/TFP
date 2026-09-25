import "server-only";

import { db } from "@/db";
import { formatGbp } from "@/lib/admin/format";
import { computeAffiliateScorecard } from "@/lib/scorecards/affiliates";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dubaiDateLabel(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Sunday 11:00 Dubai — planning session agenda from Lemoni's report (Part 03 §5).
 */
export async function sendSundayPlanningAgenda(now = new Date()) {
  const weekAgo = startOfUtcDay(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [scorecard, lemoniReport, pendingReports, openP1, approvals] =
    await Promise.all([
      computeAffiliateScorecard(),
      db.staffReport.findFirst({
        where: {
          personKey: "lemoni",
          status: { in: ["submitted", "approved"] },
          submittedAt: { gte: weekAgo },
        },
        orderBy: { submittedAt: "desc" },
      }),
      db.staffReport.findMany({
        where: { personKey: "lemoni", status: "submitted" },
        orderBy: { submittedAt: "desc" },
        take: 3,
        select: { periodLabel: true, body: true, submittedAt: true },
      }),
      db.alert.count({
        where: { status: { in: ["open", "acknowledged"] }, severity: "p1" },
      }),
      db.approvalRequest.count({ where: { status: "pending" } }),
    ]);

  const blockers =
    pendingReports.length > 0
      ? pendingReports.map(
          (r) =>
            `· ${esc(r.periodLabel)} — ${esc((r.body ?? "").slice(0, 120))}${
              (r.body?.length ?? 0) > 120 ? "…" : ""
            }`,
        )
      : ["· none submitted this week — chase Lemoni"];

  const text = [
    `<b>SUNDAY PLANNING AGENDA</b> | ${esc(dubaiDateLabel(now))} · 12:00 session`,
    "",
    "<b>1. Lemoni affiliate scorecard</b>",
    `· Affiliates ${scorecard.affiliateCount} · codes ${scorecard.codeCount}`,
    `· AK1 register % ${scorecard.registerIntegrityPct} · AK2 active % ${scorecard.activeRatePct}`,
    `· AK5 ${esc(scorecard.ak5)} · AK6 ${esc(scorecard.ak6)}`,
    lemoniReport
      ? `· Latest report: ${esc(lemoniReport.periodLabel)} (${esc(lemoniReport.status)})`
      : "· Latest report: not landed",
    "",
    "<b>2. Blocked items + her recommendation</b>",
    ...blockers,
    "",
    "<b>3. CTO week-ahead by ladder tier</b>",
    `· Open P1: ${openP1} · Pending approvals: ${approvals}`,
    "· Tier 1 Money/customers · Tier 2 Ops · Tier 3 Content · Tier 4 Meta creative · Tier 5 New surfaces",
    "",
    "<b>4. Calendar conflicts</b>",
    "· Filming block this afternoon (protected) · Monday content strategy",
    "",
    "Full desks → /admin/team · Affiliates on Lemoni report",
  ].join("\n");

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({ chatId: kaneChatId, text });
  }

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "cadence.sunday_agenda",
      meta: { sent: Boolean(kaneChatId), hasReport: Boolean(lemoniReport) },
    },
  });

  return { sent: Boolean(kaneChatId), text };
}

/**
 * Saturday 20:00 Dubai — check Lemoni's weekly report landed (Part 03 §5).
 */
export async function checkLemoniReportDue(now = new Date()) {
  const weekAgo = startOfUtcDay(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const report = await db.staffReport.findFirst({
    where: {
      personKey: "lemoni",
      status: { in: ["submitted", "approved"] },
      OR: [
        { submittedAt: { gte: weekAgo } },
        { createdAt: { gte: weekAgo } },
      ],
    },
    orderBy: { submittedAt: "desc" },
  });

  const landed = Boolean(report);
  const text = landed
    ? [
        `<b>Lemoni weekly report</b> · landed`,
        `Period: ${esc(report!.periodLabel)} · status ${esc(report!.status)}`,
        "CTO pre-read before Sunday 12:00 planning.",
        "",
        esc((report!.body ?? "").slice(0, 400)),
        (report!.body?.length ?? 0) > 400 ? "…" : "",
      ].join("\n")
    : [
        `<b>Lemoni weekly report DUE</b>`,
        "No submitted report this week. Chase before Sunday 12:00 planning.",
        "Expected: affiliate scorecard, blockers, content needs, Kane's week ahead.",
      ].join("\n");

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({ chatId: kaneChatId, text });
  }

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "cadence.lemoni_report_due",
      meta: { landed, sent: Boolean(kaneChatId) },
    },
  });

  return { landed, sent: Boolean(kaneChatId), text };
}

/**
 * Monday 09:00 Dubai — week-on-week business summary by line (Part 03 §5).
 */
export async function sendMondayWeekOnWeek(now = new Date()) {
  const today = startOfUtcDay(now);
  const thisWeekStart = new Date(today);
  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);
  const prevWeekStart = new Date(thisWeekStart);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);

  const lines = ["supplements", "coaching", "training"] as const;

  const [thisWeek, prevWeek, thisAds, prevAds] = await Promise.all([
    db.warehouseOrder.groupBy({
      by: ["businessLine"],
      where: {
        paidAt: { gte: thisWeekStart, lt: today },
        businessLine: { in: [...lines] },
      },
      _sum: { netPence: true },
      _count: true,
    }),
    db.warehouseOrder.groupBy({
      by: ["businessLine"],
      where: {
        paidAt: { gte: prevWeekStart, lt: thisWeekStart },
        businessLine: { in: [...lines] },
      },
      _sum: { netPence: true },
      _count: true,
    }),
    db.adDaily.aggregate({
      where: { date: { gte: thisWeekStart, lt: today } },
      _sum: { spendPence: true },
    }),
    db.adDaily.aggregate({
      where: { date: { gte: prevWeekStart, lt: thisWeekStart } },
      _sum: { spendPence: true },
    }),
  ]);

  const thisMap = new Map(
    thisWeek.map((r) => [
      r.businessLine,
      { net: r._sum.netPence ?? 0, count: r._count },
    ]),
  );
  const prevMap = new Map(
    prevWeek.map((r) => [
      r.businessLine,
      { net: r._sum.netPence ?? 0, count: r._count },
    ]),
  );

  const rowLines = lines.map((line) => {
    const cur = thisMap.get(line) ?? { net: 0, count: 0 };
    const prev = prevMap.get(line) ?? { net: 0, count: 0 };
    const delta =
      prev.net === 0
        ? cur.net > 0
          ? "+new"
          : "flat"
        : `${(((cur.net - prev.net) / prev.net) * 100).toFixed(0)}%`;
    return `· ${line}: ${formatGbp(cur.net)} (${cur.count} orders) vs ${formatGbp(prev.net)} · ${delta}`;
  });

  const thisSpend = thisAds._sum.spendPence ?? 0;
  const prevSpend = prevAds._sum.spendPence ?? 0;
  const adDelta =
    prevSpend === 0
      ? thisSpend > 0
        ? "+new"
        : "flat"
      : `${(((thisSpend - prevSpend) / prevSpend) * 100).toFixed(0)}%`;

  const hasData =
    thisWeek.length + prevWeek.length > 0 || thisSpend + prevSpend > 0;

  const text = [
    `<b>WEEK-ON-WEEK</b> | ${esc(dubaiDateLabel(now))}`,
    hasData
      ? "Last 7 days vs prior 7 days (verified warehouse)."
      : "not measurable yet — no warehouse orders / AdDaily in window.",
    "",
    "<b>By business line</b>",
    ...(hasData ? rowLines : ["· not measurable yet"]),
    "",
    `<b>Ad spend</b> ${formatGbp(thisSpend)} vs ${formatGbp(prevSpend)} · ${adDelta}`,
    "",
    "Money → /admin/money · Meta → /admin/meta",
  ].join("\n");

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({ chatId: kaneChatId, text });
  }

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "cadence.week_on_week",
      meta: { sent: Boolean(kaneChatId), hasData },
    },
  });

  return { sent: Boolean(kaneChatId), text };
}

/**
 * 1st of month — P&L by business line + outgoings vs previous month (Part 03 §5).
 * Source: Leah CSV / FinanceTxn + warehouse — not Triple Whale.
 */
export async function sendMonthPnlTelegram(now = new Date()) {
  const today = startOfUtcDay(now);
  // Only meaningful on 1st Dubai day — caller cron gates; still safe if re-run
  const thisMonthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
  );
  const thisMonthEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );
  const prevMonthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1),
  );

  const lines = ["supplements", "coaching", "training"] as const;

  const [revThis, revPrev, finThis, finPrev, affiliates] = await Promise.all([
    db.warehouseOrder.groupBy({
      by: ["businessLine"],
      where: {
        paidAt: { gte: thisMonthStart, lt: thisMonthEnd },
        businessLine: { in: [...lines] },
      },
      _sum: { netPence: true, cogsPence: true, shippingPence: true },
    }),
    db.warehouseOrder.groupBy({
      by: ["businessLine"],
      where: {
        paidAt: { gte: prevMonthStart, lt: thisMonthStart },
        businessLine: { in: [...lines] },
      },
      _sum: { netPence: true, cogsPence: true, shippingPence: true },
    }),
    db.financeTxn.groupBy({
      by: ["category"],
      where: {
        date: { gte: thisMonthStart, lt: thisMonthEnd },
        amountPence: { lt: 0 },
      },
      _sum: { amountPence: true },
    }),
    db.financeTxn.groupBy({
      by: ["category"],
      where: {
        date: { gte: prevMonthStart, lt: thisMonthStart },
        amountPence: { lt: 0 },
      },
      _sum: { amountPence: true },
    }),
    db.affiliateCode.findMany({
      take: 20,
      orderBy: { commissionPence: "desc" },
      include: { affiliate: { select: { name: true } } },
    }),
  ]);

  const revMap = (rows: typeof revThis) =>
    new Map(
      rows.map((r) => [
        r.businessLine,
        {
          net: r._sum.netPence ?? 0,
          direct:
            (r._sum.cogsPence ?? 0) + (r._sum.shippingPence ?? 0),
        },
      ]),
    );
  const thisRev = revMap(revThis);
  const prevRev = revMap(revPrev);

  const pnlLines = lines.map((line) => {
    const cur = thisRev.get(line) ?? { net: 0, direct: 0 };
    const prev = prevRev.get(line) ?? { net: 0, direct: 0 };
    const contrib = cur.net - cur.direct;
    return `· ${line}: rev ${formatGbp(cur.net)} · contrib ${formatGbp(contrib)} (prior rev ${formatGbp(prev.net)})`;
  });

  const outThis = finThis
    .sort((a, b) => (a._sum.amountPence ?? 0) - (b._sum.amountPence ?? 0))
    .slice(0, 8)
    .map((r) => {
      const prev = finPrev.find((p) => p.category === r.category);
      return `· ${esc(r.category)}: ${formatGbp(Math.abs(r._sum.amountPence ?? 0))} (prior ${formatGbp(Math.abs(prev?._sum.amountPence ?? 0))})`;
    });

  const affiliateLines =
    affiliates.length === 0
      ? ["· not measurable yet"]
      : affiliates.slice(0, 5).map(
          (c) =>
            `· ${esc(c.affiliate.name)} / ${esc(c.code)}: commission ${formatGbp(c.commissionPence)} · orders ${c.ordersCount}`,
        );

  const monthLabel = thisMonthStart.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const hasData =
    revThis.length + revPrev.length + finThis.length + affiliates.length > 0;

  const text = [
    `<b>MONTH P&amp;L</b> | ${esc(monthLabel)} (prior month closed)`,
    hasData
      ? "From warehouse + Leah FinanceTxn — not Triple Whale."
      : "not measurable yet — upload Leah CSV / wait for warehouse pulls.",
    "",
    "<b>By business line</b>",
    ...(hasData ? pnlLines : ["· not measurable yet"]),
    "",
    "<b>Outgoings by category vs prior</b>",
    ...(outThis.length ? outThis : ["· not measurable yet"]),
    "",
    "<b>Per-affiliate net contribution (commission proxy)</b>",
    ...affiliateLines,
    "",
    "Setter conversion → /admin/coaching · Full money → /admin/money",
  ].join("\n");

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({ chatId: kaneChatId, text });
  }

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "cadence.month_pnl",
      meta: {
        month: thisMonthStart.toISOString().slice(0, 7),
        sent: Boolean(kaneChatId),
        hasData,
      },
    },
  });

  return { sent: Boolean(kaneChatId), text };
}
