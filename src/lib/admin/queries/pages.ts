import "server-only";

import { db } from "@/db";
import { formatGbp, relativeFreshness } from "@/lib/admin/format";
import { requestNow, startOfUtcDay } from "@/lib/admin/request-time";

export async function getMoneyPageData(hideTeamPay: boolean) {
  const balances = await db.cashBalance.findMany({ orderBy: { account: "asc" } });
  const due = await db.paymentDue.findMany({
    where: {
      status: { in: ["due", "awaiting_kane"] },
      ...(hideTeamPay ? { isTeamPay: false } : {}),
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
  const mtdStart = startOfUtcDay(await requestNow());
  mtdStart.setUTCDate(1);
  const orders = await db.warehouseOrder.groupBy({
    by: ["businessLine"],
    where: { paidAt: { gte: mtdStart } },
    _sum: { netPence: true, cogsPence: true, shippingPence: true },
  });
  const adSpend = await db.adDaily.aggregate({
    where: { date: { gte: mtdStart } },
    _sum: { spendPence: true },
  });

  return {
    balances,
    due,
    orders,
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
  const setters = await db.call.groupBy({
    by: ["setter", "outcome"],
    where: { scheduledAt: { gte: mtdStart } },
    _count: true,
  });
  const tiers = await db.programmeEnrolment.groupBy({
    by: ["tier"],
    where: { line: "coaching", status: "active" },
    _count: true,
    _sum: { pricePence: true },
  });

  return {
    cashMtd: payments.reduce((s, p) => s + p.amountPence, 0),
    pending,
    setters,
    tiers,
    targetPence: 8_500_000,
  };
}

export async function getTrainingPageData() {
  const active = await db.programmeEnrolment.count({
    where: { line: "training", status: "active" },
  });
  const mrr = await db.programmeEnrolment.aggregate({
    where: { line: "training", status: "active" },
    _sum: { pricePence: true },
  });
  const byWeek = await db.programmeEnrolment.groupBy({
    by: ["currentWeek"],
    where: { line: "training", status: "active" },
    _count: true,
  });
  const silent = await db.programmeEnrolment.findMany({
    where: { line: "training", status: "active", currentWeek: { gte: 1 } },
    include: { person: true },
    take: 5,
    orderBy: { updatedAt: "asc" },
  });

  return {
    active,
    mrr: mrr._sum.pricePence ?? 0,
    byWeek,
    silent,
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
    where: { objectType: "ad_set" },
    orderBy: { occurredAt: "desc" },
    take: 10,
  });
  const totalSpend = [...bySet.values()].reduce((s, r) => s + r.spend, 0);
  const totalValue = [...bySet.values()].reduce((s, r) => s + r.value7d, 0);

  return {
    adSets: [...bySet.entries()].map(([id, v]) => ({
      id,
      ...v,
      amer7d: v.spend ? v.value7d / v.spend : 0,
      amerIncr: v.spend ? v.valueIncr / v.spend : 0,
    })),
    changeEvents,
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
  const assets = await db.contentAsset.findMany({
    include: { postCards: { include: { metrics: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const awaiting = await db.postCard.findMany({
    where: { status: "awaiting_kane" },
    include: { asset: true },
    orderBy: { createdAt: "asc" },
  });
  return { assets, awaiting };
}

export async function getIntegrationsPageData() {
  return db.connectorRun.findMany({ orderBy: { sourceId: "asc" } });
}

export { formatGbp, relativeFreshness };
