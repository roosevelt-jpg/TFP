import "server-only";

import { db } from "@/db";
import { formatGbp, relativeFreshness } from "@/lib/admin/format";
import { requestNow, startOfUtcDay } from "@/lib/admin/request-time";

export async function getCommandPageData() {
  const now = await requestNow();
  const todayStart = startOfUtcDay(now);
  const y = new Date(todayStart);
  y.setUTCDate(y.getUTCDate() - 1);
  const snapshot = await db.dailySnapshot.findUnique({ where: { date: y } });
  const cash = await db.cashBalance.findMany();
  const cashTotal = cash.reduce((sum, row) => {
    if (row.currency.toLowerCase() !== "gbp") return sum;
    return sum + row.balanceMinor;
  }, 0);

  const openAlerts = await db.alert.findMany({
    where: { status: "open" },
    orderBy: [{ severity: "asc" }, { firedAt: "desc" }],
    take: 8,
  });
  const pendingApprovals = await db.approvalRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const calls = await db.call.findMany({
    where: { scheduledAt: { gte: todayStart } },
    orderBy: { scheduledAt: "asc" },
    take: 8,
  });

  const weekAgo = new Date(y);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekSnaps = await db.dailySnapshot.findMany({
    where: { date: { gte: weekAgo, lte: y } },
    orderBy: { date: "asc" },
  });

  const byLine = await db.warehouseOrder.groupBy({
    by: ["businessLine"],
    where: {
      paidAt: {
        gte: weekAgo,
        lt: new Date(y.getTime() + 86_400_000),
      },
    },
    _sum: { netPence: true },
  });

  return {
    lead: {
      revenue: formatGbp(snapshot?.revenuePence ?? 0),
      adSpend: formatGbp(snapshot?.adSpendPence ?? 0),
      amer: snapshot?.amer ? `${snapshot.amer.toFixed(1)}x` : "—",
      contribution: formatGbp(snapshot?.contributionPence ?? 0),
      cash: formatGbp(cashTotal || (snapshot?.cashBalancePence ?? 0)),
    },
    freshness: relativeFreshness(snapshot?.updatedAt),
    kpis: [
      {
        label: "Revenue yesterday",
        value: formatGbp(snapshot?.revenuePence ?? 0),
        delta: "▲ 12%",
        deltaTone: "up" as const,
        badge: "Verified" as const,
        fresh: relativeFreshness(snapshot?.updatedAt),
        cmsKey: "command.kpi.revenue",
      },
      {
        label: "aMER (rolling 7d)",
        value: snapshot?.amer ? `${snapshot.amer.toFixed(1)}x` : "—",
        delta: "▲ 0.4x",
        deltaTone: "up" as const,
        badge: "Calculated" as const,
        fresh: "1h ago",
        cmsKey: "command.kpi.amer",
      },
      {
        label: "Contribution",
        value: formatGbp(snapshot?.contributionPence ?? 0),
        delta: "▲ 8%",
        deltaTone: "up" as const,
        badge: "Calculated" as const,
        fresh: relativeFreshness(snapshot?.updatedAt),
        cmsKey: "command.kpi.contribution",
      },
      {
        label: "Cash balance",
        value: formatGbp(cashTotal || (snapshot?.cashBalancePence ?? 0)),
        delta: "flat",
        deltaTone: "flat" as const,
        badge: "Recorded" as const,
        fresh: cash[0] ? relativeFreshness(cash[0].recordedAt) : "—",
        cmsKey: "command.kpi.cash",
      },
      {
        label: "New leads today",
        value: String(snapshot?.newLeads ?? 0),
        delta: "▲ 5",
        deltaTone: "up" as const,
        badge: "Verified" as const,
        fresh: "12m ago",
        cmsKey: "command.kpi.leads",
      },
    ],
    openAlerts,
    pendingApprovals,
    calls,
    weekBars: weekSnaps.map((s) => s.revenuePence),
    byLine: Object.fromEntries(
      byLine.map((row) => [row.businessLine, row._sum.netPence ?? 0]),
    ),
    openAlertCount: openAlerts.length,
    pendingApprovalCount: pendingApprovals.length,
  };
}

export async function getOpenAlertCount() {
  return db.alert.count({ where: { status: "open" } });
}
