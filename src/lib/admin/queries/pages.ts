import "server-only";

import { db } from "@/db";
import { formatGbp, relativeFreshness } from "@/lib/admin/format";
import { requestNow, startOfUtcDay } from "@/lib/admin/request-time";
import { dubaiWeekStartMonday } from "@/lib/content/social-manager";
import { getWhatsAppCoachHealth } from "@/lib/training/coach-health";

/** Categories that must not appear for non-Kane (team pay). */
const TEAM_PAY_CATEGORIES = [
  "TEAM_PAY",
  "CONTRACTOR",
  "TEAM",
  "PAYROLL",
] as const;

const PNL_LINES = ["supplements", "coaching", "training"] as const;

export async function getMoneyPageData(hideTeamPay: boolean) {
  const now = await requestNow();
  const balances = await db.cashBalance.findMany({
    orderBy: { account: "asc" },
  });
  const due = await db.paymentDue.findMany({
    where: {
      status: { in: ["due", "awaiting_kane"] },
      ...(hideTeamPay ? { isTeamPay: false } : {}),
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
  const mtdStart = startOfUtcDay(now);
  mtdStart.setUTCDate(1);
  const burnSince = startOfUtcDay(now);
  burnSince.setUTCDate(burnSince.getUTCDate() - 30);

  const teamPayFilter = hideTeamPay
    ? { category: { notIn: [...TEAM_PAY_CATEGORIES] } }
    : {};

  const [orders, financeByLine, burnAgg, adSpend] = await Promise.all([
    db.warehouseOrder.groupBy({
      by: ["businessLine"],
      where: { paidAt: { gte: mtdStart } },
      _sum: { netPence: true, cogsPence: true, shippingPence: true },
    }),
    db.financeTxn.groupBy({
      by: ["businessLine"],
      where: {
        date: { gte: mtdStart },
        ...teamPayFilter,
      },
      _sum: { amountPence: true },
    }),
    db.financeTxn.aggregate({
      where: {
        date: { gte: burnSince },
        amountPence: { lt: 0 },
        ...teamPayFilter,
      },
      _sum: { amountPence: true },
    }),
    db.adDaily.aggregate({
      where: { date: { gte: mtdStart } },
      _sum: { spendPence: true },
    }),
  ]);

  const orderMap = new Map(
    orders.map((row) => [
      row.businessLine,
      {
        revenuePence: row._sum.netPence ?? 0,
        directCostPence:
          (row._sum.cogsPence ?? 0) + (row._sum.shippingPence ?? 0),
      },
    ]),
  );
  const financeMap = new Map(
    financeByLine.map((row) => [row.businessLine, row._sum.amountPence ?? 0]),
  );

  const pnlByLine = PNL_LINES.map((line) => {
    const order = orderMap.get(line) ?? {
      revenuePence: 0,
      directCostPence: 0,
    };
    const financeNetPence = financeMap.get(line) ?? 0;
    return {
      businessLine: line,
      revenuePence: order.revenuePence,
      directCostPence: order.directCostPence,
      financeNetPence,
      contributionPence:
        order.revenuePence - order.directCostPence + financeNetPence,
    };
  });

  const cashGbp = balances.reduce((sum, b) => {
    if (b.currency.toLowerCase() !== "gbp") return sum;
    return sum + b.balanceMinor;
  }, 0);
  const burn30dPence = Math.abs(burnAgg._sum.amountPence ?? 0);
  const dailyBurnPence = burn30dPence > 0 ? Math.round(burn30dPence / 30) : 0;
  const runwayDays =
    cashGbp > 0 && dailyBurnPence > 0
      ? Math.round(cashGbp / dailyBurnPence)
      : null;

  return {
    balances,
    due,
    orders,
    pnlByLine,
    runwayDays,
    cashGbp,
    dailyBurnPence,
    adSpendPence: adSpend._sum.spendPence ?? 0,
    freshness: balances[0]
      ? relativeFreshness(balances[0].recordedAt)
      : "—",
  };
}

export async function getSupplementsPageData() {
  const y = startOfUtcDay(await requestNow());
  y.setUTCDate(y.getUTCDate() - 1);
  const next = new Date(y);
  next.setUTCDate(next.getUTCDate() + 1);

  const orders = await db.warehouseOrder.findMany({
    where: {
      businessLine: "supplements",
      paidAt: { gte: y, lt: next },
    },
    include: { lines: true },
  });
  const stock = await db.stockItem.findMany({ orderBy: { daysOfCover: "asc" } });
  const subs = await db.subscriptionMirror.count({
    where: { status: { in: ["ACTIVE", "active"] } },
  });

  const net = orders.reduce((s, o) => s + o.netPence, 0);
  const contribution = orders.reduce(
    (s, o) => s + o.netPence - o.cogsPence - o.shippingPence,
    0,
  );
  const stackShare =
    orders.length === 0
      ? 0
      : Math.round((orders.filter((o) => o.isStack).length / orders.length) * 100);

  const skuMap = new Map<string, { units: number; net: number }>();
  for (const order of orders) {
    for (const line of order.lines) {
      const cur = skuMap.get(line.sku) ?? { units: 0, net: 0 };
      cur.units += line.quantity;
      cur.net += line.netPence;
      skuMap.set(line.sku, cur);
    }
  }

  return {
    orderCount: orders.length,
    net,
    contribution,
    stackShare,
    subs,
    stock,
    topSkus: [...skuMap.entries()]
      .map(([sku, v]) => ({ sku, ...v }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 8),
    freshness: relativeFreshness(orders[0]?.sourceFreshAt ?? null),
  };
}

export async function getCoachingPageData() {
  const mtdStart = startOfUtcDay(await requestNow());
  mtdStart.setUTCDate(1);
  const payments = await db.warehousePayment.findMany({
    where: { businessLine: "coaching", paidAt: { gte: mtdStart } },
  });
  const pending = await db.programmeEnrolment.findMany({
    where: { line: "coaching", status: "pending_onboarding" },
    include: { person: true },
    take: 10,
  });
  const [setters, tiers, callCash, dmQualified, dmBySetter] = await Promise.all([
    db.call.groupBy({
      by: ["setter", "outcome"],
      where: { scheduledAt: { gte: mtdStart } },
      _count: true,
    }),
    db.programmeEnrolment.groupBy({
      by: ["tier"],
      where: { line: "coaching", status: "active" },
      _count: true,
      _sum: { pricePence: true },
    }),
    db.call.groupBy({
      by: ["setter"],
      where: { scheduledAt: { gte: mtdStart } },
      _sum: { cashCollectedPence: true },
      _count: true,
    }),
    db.leadThread.count({
      where: {
        highIntent: true,
        OR: [
          { lastInboundAt: { gte: mtdStart } },
          { createdAt: { gte: mtdStart } },
        ],
      },
    }),
    db.leadThread.groupBy({
      by: ["setterKey"],
      where: {
        highIntent: true,
        setterKey: { not: null },
        OR: [
          { lastInboundAt: { gte: mtdStart } },
          { createdAt: { gte: mtdStart } },
        ],
      },
      _count: { _all: true },
    }),
  ]);

  const outcomeBySetter = new Map<
    string,
    { booked: number; held: number; closed: number; noShow: number }
  >();
  for (const row of setters) {
    const key = row.setter?.trim() || "Unassigned";
    const cur = outcomeBySetter.get(key) ?? {
      booked: 0,
      held: 0,
      closed: 0,
      noShow: 0,
    };
    if (row.outcome === "booked") cur.booked += row._count;
    else if (row.outcome === "held") cur.held += row._count;
    else if (row.outcome === "closed") cur.closed += row._count;
    else if (row.outcome === "no_show") cur.noShow += row._count;
    outcomeBySetter.set(key, cur);
  }

  const dmSetterMap = new Map(
    dmBySetter
      .filter((r) => r.setterKey)
      .map((r) => [r.setterKey!.trim(), r._count._all]),
  );
  const dmPerSetterMeasurable = dmSetterMap.size > 0;

  const hasCallData = setters.length > 0;
  const setterKeys = new Set([
    ...outcomeBySetter.keys(),
    ...dmSetterMap.keys(),
  ]);
  // Ensure Unassigned only when we have call data without a better key
  if (hasCallData && setterKeys.size === 0) setterKeys.add("Unassigned");

  const setterPipeline =
    setterKeys.size > 0
      ? [...setterKeys]
          .map((setter) => {
            const counts = outcomeBySetter.get(setter) ?? {
              booked: 0,
              held: 0,
              closed: 0,
              noShow: 0,
            };
            const cash = callCash.find(
              (c) => (c.setter?.trim() || "Unassigned") === setter,
            );
            const dms = dmSetterMap.get(setter);
            return {
              setter,
              ...counts,
              cashCollectedPence: cash?._sum.cashCollectedPence ?? 0,
              dmsQualified: dms ?? null,
              dmsQualifiedMeasurable: dms != null,
              paidMeasurable: false as const,
            };
          })
          .sort(
            (a, b) => b.closed - a.closed || a.setter.localeCompare(b.setter),
          )
      : [];

  return {
    cashMtd: payments.reduce((s, p) => s + p.amountPence, 0),
    pending,
    setters,
    setterPipeline,
    pipelineMeasurable: hasCallData || dmPerSetterMeasurable,
    dmQualifiedMtd: dmQualified,
    dmPerSetterMeasurable,
    dmBySetter: [...dmSetterMap.entries()].map(([setter, count]) => ({
      setter,
      count,
    })),
    tiers,
    targetPence: 8_500_000,
  };
}

export async function getTrainingPageData() {
  const now = await requestNow();
  const silentBefore = new Date(now.getTime() - 3 * 24 * 60 * 60_000);

  const [active, mrr, byWeek, silentCount, silent, n8nConnector, coachHealth] =
    await Promise.all([
      db.programmeEnrolment.count({
        where: { line: "training", status: "active" },
      }),
      db.programmeEnrolment.aggregate({
        where: { line: "training", status: "active" },
        _sum: { pricePence: true },
      }),
      db.programmeEnrolment.groupBy({
        by: ["currentWeek"],
        where: { line: "training", status: "active" },
        _count: true,
      }),
      db.programmeEnrolment.count({
        where: {
          line: "training",
          status: "active",
          updatedAt: { lte: silentBefore },
        },
      }),
      db.programmeEnrolment.findMany({
        where: {
          line: "training",
          status: "active",
          updatedAt: { lte: silentBefore },
        },
        include: { person: true },
        take: 20,
        orderBy: { updatedAt: "asc" },
      }),
      db.connectorRun.findUnique({
        where: { sourceId: "S6" },
        select: { lastSuccessAt: true, status: true, name: true },
      }),
      getWhatsAppCoachHealth(now),
    ]);

  const leaderboardAt = n8nConnector?.lastSuccessAt ?? null;
  const leaderboardFreshness = leaderboardAt
    ? relativeFreshness(leaderboardAt)
    : null;

  return {
    active,
    mrr: mrr._sum.pricePence ?? 0,
    byWeek,
    silent,
    silentCount,
    silentDays: 3,
    leaderboard: {
      measurable: Boolean(leaderboardAt),
      freshness: leaderboardFreshness,
      at: leaderboardAt,
      source: n8nConnector?.name ?? "n8n",
    },
    coachHealth,
  };
}

type AdDailyWindowAgg = {
  avgSpendPence: number | null;
  avgRoas: number | null;
  days: number;
};

function emptyAdDailyWindow(): AdDailyWindowAgg {
  return { avgSpendPence: null, avgRoas: null, days: 0 };
}

/** Aggregate AdDaily rows into avg daily spend + window ROAS (value/spend). */
function summarizeAdDailyWindow(
  rows: Array<{ date: Date; spendPence: number; purchaseValue7dPence: number }>,
): AdDailyWindowAgg {
  if (rows.length === 0) return emptyAdDailyWindow();
  const byDate = new Map<string, { spend: number; value: number }>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const cur = byDate.get(key) ?? { spend: 0, value: 0 };
    cur.spend += row.spendPence;
    cur.value += row.purchaseValue7dPence;
    byDate.set(key, cur);
  }
  const days = byDate.size;
  let totalSpend = 0;
  let totalValue = 0;
  for (const d of byDate.values()) {
    totalSpend += d.spend;
    totalValue += d.value;
  }
  return {
    days,
    avgSpendPence: days ? totalSpend / days : null,
    avgRoas: totalSpend > 0 ? totalValue / totalSpend : null,
  };
}

export async function getMetaPageData() {
  const weekAgo = await requestNow();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const rows = await db.adDaily.findMany({
    where: { date: { gte: weekAgo } },
    orderBy: { spendPence: "desc" },
  });
  const bySet = new Map<
    string,
    {
      name: string;
      spend: number;
      value7d: number;
      valueIncr: number;
      purchases7d: number;
    }
  >();
  for (const row of rows) {
    const cur = bySet.get(row.adSetId) ?? {
      name: row.adSetName,
      spend: 0,
      value7d: 0,
      valueIncr: 0,
      purchases7d: 0,
    };
    cur.spend += row.spendPence;
    cur.value7d += row.purchaseValue7dPence;
    cur.valueIncr += row.purchaseValueIncrPence;
    cur.purchases7d += row.purchases7d;
    bySet.set(row.adSetId, cur);
  }
  const changeEvents = await db.changeEvent.findMany({
    where: {
      objectType: "ad_set",
      // Silent baselines from Meta status pull — not decision overlays.
      changeType: { not: "observed" },
    },
    orderBy: { occurredAt: "desc" },
    take: 10,
  });

  const changeEventsWithSplits = await (async () => {
    if (changeEvents.length === 0) return [];
    const objectIds = [...new Set(changeEvents.map((e) => e.objectId))];
    let minStart: Date | null = null;
    let maxEnd: Date | null = null;
    for (const ev of changeEvents) {
      const day = startOfUtcDay(ev.occurredAt);
      const beforeStart = new Date(day);
      beforeStart.setUTCDate(beforeStart.getUTCDate() - 7);
      const afterEnd = new Date(day);
      afterEnd.setUTCDate(afterEnd.getUTCDate() + 7);
      if (!minStart || beforeStart < minStart) minStart = beforeStart;
      if (!maxEnd || afterEnd > maxEnd) maxEnd = afterEnd;
    }
    const history = await db.adDaily.findMany({
      where: {
        adSetId: { in: objectIds },
        date: {
          gte: minStart ?? undefined,
          lt: maxEnd ?? undefined,
        },
      },
      select: {
        adSetId: true,
        date: true,
        spendPence: true,
        purchaseValue7dPence: true,
      },
    });
    return changeEvents.map((ev) => {
      const day = startOfUtcDay(ev.occurredAt);
      const beforeStart = new Date(day);
      beforeStart.setUTCDate(beforeStart.getUTCDate() - 7);
      const afterEnd = new Date(day);
      afterEnd.setUTCDate(afterEnd.getUTCDate() + 7);
      const forSet = history.filter((r) => r.adSetId === ev.objectId);
      const beforeRows = forSet.filter(
        (r) => r.date >= beforeStart && r.date < day,
      );
      const afterRows = forSet.filter(
        (r) => r.date >= day && r.date < afterEnd,
      );
      return {
        ...ev,
        before: summarizeAdDailyWindow(beforeRows),
        after: summarizeAdDailyWindow(afterRows),
      };
    });
  })();

  const totalSpend = [...bySet.values()].reduce((s, r) => s + r.spend, 0);
  const totalValue = [...bySet.values()].reduce((s, r) => s + r.value7d, 0);

  return {
    adSets: [...bySet.entries()].map(([id, v]) => ({
      id,
      ...v,
      amer7d: v.spend ? v.value7d / v.spend : 0,
      amerIncr: v.spend ? v.valueIncr / v.spend : 0,
    })),
    changeEvents: changeEventsWithSplits,
    totalSpend,
    amer: totalSpend ? totalValue / totalSpend : 0,
  };
}

export async function getEmailPageData() {
  const emails = await db.emailDaily.findMany({
    orderBy: { date: "desc" },
    take: 20,
  });
  const threads = await db.leadThread.findMany({
    where: { lastReplyAt: null },
    orderBy: { lastInboundAt: "asc" },
    take: 20,
  });
  return { emails, threads };
}

export async function getFulfilmentPageData() {
  const open = await db.fulfilment.findMany({
    where: { fulfilledAt: null },
    include: { order: true },
    orderBy: { paidAt: "asc" },
    take: 30,
  });
  const recent = await db.fulfilment.findMany({
    where: { fulfilledAt: { not: null }, region: "UK" },
    take: 200,
  });
  const within24 = recent.filter(
    (f) => f.hoursToDispatch != null && f.hoursToDispatch <= 24,
  ).length;
  const rate = recent.length ? Math.round((within24 / recent.length) * 100) : 0;
  return { open, rate, gaps: open.filter((o) => o.componentGaps > 0).length };
}

export async function getTeamPageData() {
  const today = startOfUtcDay(await requestNow());
  const kpis = await db.kpiValue.findMany({
    where: { date: today },
    orderBy: [{ personKey: "asc" }, { kpiId: "asc" }],
  });
  const byPerson = new Map<string, typeof kpis>();
  for (const kpi of kpis) {
    const list = byPerson.get(kpi.personKey) ?? [];
    list.push(kpi);
    byPerson.set(kpi.personKey, list);
  }
  return { byPerson };
}

export async function getAlertsPageData() {
  const [open, approvals, log] = await Promise.all([
    db.alert.findMany({
      where: { status: { in: ["open", "acknowledged"] } },
      orderBy: [{ severity: "asc" }, { firedAt: "desc" }],
    }),
    db.approvalRequest.findMany({
      where: { status: { in: ["pending", "approved"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.approvalRequest.findMany({
      where: { status: { in: ["executed", "rejected", "expired", "voided"] } },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);
  return { open, approvals, log };
}

export async function getContentPageData() {
  const weekStart = dubaiWeekStartMonday();
  const since7 = startOfUtcDay(await requestNow());
  since7.setUTCDate(since7.getUTCDate() - 7);

  const [assets, awaiting, weeklyPlan, recentMetrics] = await Promise.all([
    db.contentAsset.findMany({
      include: { postCards: { include: { metrics: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.postCard.findMany({
      where: { status: "awaiting_kane" },
      include: { asset: true },
      orderBy: { createdAt: "asc" },
    }),
    db.weeklyPostingPlan.findUnique({ where: { weekStart } }),
    db.postMetric.findMany({
      where: { capturedAt: { gte: since7 } },
      orderBy: { views: "desc" },
      take: 40,
      include: {
        postCard: {
          select: {
            id: true,
            platform: true,
            account: true,
            status: true,
            asset: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  // Best metric row per post card (highest views)
  const bestByCard = new Map<string, (typeof recentMetrics)[number]>();
  for (const m of recentMetrics) {
    const prev = bestByCard.get(m.postCardId);
    if (!prev || m.views > prev.views) bestByCard.set(m.postCardId, m);
  }
  const postMetrics = [...bestByCard.values()].sort(
    (a, b) => b.views - a.views,
  );

  type Bucket = "instagram" | "tiktok" | "youtube_shorts" | "youtube" | "other";
  const bucket = (platform: string): Bucket => {
    const p = platform.toLowerCase();
    if (p.includes("instagram") || p === "ig") return "instagram";
    if (p.includes("tiktok")) return "tiktok";
    if (p.includes("short")) return "youtube_shorts";
    if (p.includes("youtube") || p === "yt") return "youtube";
    return "other";
  };

  const bestByType = new Map<
    Bucket,
    {
      platform: string;
      account: string;
      title: string;
      checkpoint: string;
      views: number;
      likes: number;
      comments: number;
      shares: number;
    }
  >();
  for (const m of postMetrics) {
    const b = bucket(m.postCard.platform);
    const cur = bestByType.get(b);
    if (!cur || m.views > cur.views) {
      bestByType.set(b, {
        platform: m.postCard.platform,
        account: m.postCard.account,
        title: m.postCard.asset.title,
        checkpoint: m.checkpoint,
        views: m.views,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
      });
    }
  }

  return {
    assets,
    awaiting,
    weeklyPlan,
    postMetrics: postMetrics.slice(0, 15).map((m) => ({
      postCardId: m.postCardId,
      title: m.postCard.asset.title,
      platform: m.postCard.platform,
      account: m.postCard.account,
      checkpoint: m.checkpoint,
      views: m.views,
      likes: m.likes,
      comments: m.comments,
      shares: m.shares,
      capturedAt: m.capturedAt,
    })),
    bestByType: [...bestByType.entries()].map(([type, row]) => ({
      type,
      ...row,
    })),
  };
}

export async function getIntegrationsPageData() {
  return db.connectorRun.findMany({ orderBy: { sourceId: "asc" } });
}

export { formatGbp, relativeFreshness };
