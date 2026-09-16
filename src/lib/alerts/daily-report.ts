import "server-only";

import { db } from "@/db";
import { formatGbp } from "@/lib/admin/format";

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

  return [
    "<b>Kane daily to-do</b> (07:30 Dubai)",
    `1. Open P1 alerts: ${openP1}`,
    `2. Approvals waiting: ${approvals}`,
    `3. Calls today: ${calls}`,
    "4. Content cards awaiting approval — check /admin/content",
    "5. Money due list — check /admin/money",
  ].join("\n");
}

export async function buildDailyReport() {
  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  y.setUTCHours(0, 0, 0, 0);
  const snap = await db.dailySnapshot.findUnique({ where: { date: y } });

  return [
    "<b>TFP daily report</b> (08:00 Dubai)",
    `Revenue yesterday: ${formatGbp(snap?.revenuePence ?? 0)} (calculated)`,
    `Ad spend: ${formatGbp(snap?.adSpendPence ?? 0)} (verified)`,
    `aMER: ${snap?.amer?.toFixed(1) ?? "—"}x (calculated)`,
    `Contribution: ${formatGbp(snap?.contributionPence ?? 0)} (calculated)`,
    "",
    "Decide: open /admin/alerts for anything waiting.",
  ].join("\n");
}
