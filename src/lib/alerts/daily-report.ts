import "server-only";

import { db } from "@/db";
import { formatGbp } from "@/lib/admin/format";
import { getTeamMonitorSnapshot } from "@/lib/admin/team-monitor";

export async function buildDailyTodo() {
  const openP1 = await db.alert.count({
    where: { status: "open", severity: "p1" },
  });
  const approvals = await db.approvalRequest.count({
    where: { status: "pending" },
  });
  const calls = await db.call.count({
    where: {
      scheduledAt: {
        gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
      },
    },
  });
  const pendingReports = await db.staffReport.count({
    where: { status: "submitted" },
  });
  const overdueTodos = await db.staffTodo.count({
    where: { status: "open", dueAt: { lt: new Date() } },
  });
  const dues = await db.paymentDue.count({
    where: { status: { in: ["due", "awaiting_kane"] } },
  });
  const contentAwaiting = await db.contentAsset.count({
    where: { state: "awaiting_kane" },
  });
  const pastDueSubs = await db.subscription.count({
    where: { status: "past_due" },
  });

  return [
    "<b>Kane daily to-do</b> (07:30 Dubai)",
    `1. Open P1 alerts: ${openP1}`,
    `2. Approvals waiting: ${approvals}`,
    `3. Calls today: ${calls}`,
    `4. Staff reports to review: ${pendingReports}`,
    `5. Overdue team todos: ${overdueTodos}`,
    `6. Content awaiting Kane: ${contentAwaiting} — /admin/content`,
    `7. Payments due / awaiting Kane: ${dues} — /admin/money`,
    `8. Past-due subscriptions: ${pastDueSubs}`,
    "9. Funnel metrics — /admin/growth/funnel",
    "10. Clients needing attention — /admin/clients",
  ].join("\n");
}

export async function buildDailyReport() {
  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  y.setUTCHours(0, 0, 0, 0);
  const snap = await db.dailySnapshot.findUnique({ where: { date: y } });
  const team = await getTeamMonitorSnapshot();

  const since7 = new Date();
  since7.setUTCDate(since7.getUTCDate() - 7);
  const [leads7, pays7, failed7, openP1, openP2] = await Promise.all([
    db.funnelEvent.count({
      where: { eventName: "lead_submitted", occurredAt: { gte: since7 } },
    }),
    db.funnelEvent.count({
      where: { eventName: "payment_succeeded", occurredAt: { gte: since7 } },
    }),
    db.funnelEvent.count({
      where: { eventName: "payment_failed", occurredAt: { gte: since7 } },
    }),
    db.alert.count({ where: { status: "open", severity: "p1" } }),
    db.alert.count({ where: { status: "open", severity: "p2" } }),
  ]);

  const teamLines = team.map((person) => {
    const kpiBit =
      person.latestKpis.length === 0
        ? "KPIs n/a"
        : person.latestKpis
            .slice(0, 3)
            .map((k) => `${k.kpiId}=${k.value}`)
            .join(", ");
    return `${person.name}: todos ${person.openTodos} (overdue ${person.overdueTodos}) · reports pending ${person.pendingReports} · ${kpiBit}`;
  });

  return [
    "<b>TFP daily report</b> (08:00 Dubai)",
    "",
    "<b>1. Money (yesterday)</b>",
    `Revenue: ${formatGbp(snap?.revenuePence ?? 0)} (calculated)`,
    `Ad spend: ${formatGbp(snap?.adSpendPence ?? 0)} (verified)`,
    `aMER: ${snap?.amer?.toFixed(1) ?? "—"}x (calculated)`,
    `Contribution: ${formatGbp(snap?.contributionPence ?? 0)} (calculated)`,
    `Cash balance: ${formatGbp(snap?.cashBalancePence ?? 0)} (recorded)`,
    "",
    "<b>2. Funnel (7d)</b>",
    `Leads: ${leads7} · Payments: ${pays7} · Failed: ${failed7}`,
    "",
    "<b>3. Alerts</b>",
    `Open P1: ${openP1} · Open P2: ${openP2}`,
    "",
    "<b>4. Team desks</b>",
    ...teamLines,
    "",
    "Decide: /admin for Command · /admin/growth/funnel · /admin/team",
  ].join("\n");
}
