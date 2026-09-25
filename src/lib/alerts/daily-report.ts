import "server-only";

import { db } from "@/db";
import { formatGbp } from "@/lib/admin/format";
import { getTeamMonitorSnapshot } from "@/lib/admin/team-monitor";

/** Escape dynamic text for Telegram HTML parse_mode. */
function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dubaiDateLabel(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function startOfUtcDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function yesterdayUtc() {
  const y = startOfUtcDay();
  y.setUTCDate(y.getUTCDate() - 1);
  return y;
}

function na(label = "not measurable yet") {
  return label;
}

function withLabel(value: string, kind: "verified" | "recorded" | "calculated") {
  return `${value} (${kind})`;
}

/** Kane daily to-do — fixed protected-block order (Part 03 §6). */
export async function buildDailyTodo() {
  const todayStart = startOfUtcDay();
  const [
    openP1,
    p1Titles,
    approvals,
    pendingApprovalRows,
    calls,
    callRows,
    dues,
    overdueTodos,
    contentAwaiting,
    pastDueSubs,
  ] = await Promise.all([
    db.alert.count({ where: { status: "open", severity: "p1" } }),
    db.alert.findMany({
      where: { status: { in: ["open", "acknowledged"] }, severity: "p1" },
      orderBy: { firedAt: "asc" },
      take: 5,
      select: { ruleId: true, title: true },
    }),
    db.approvalRequest.count({ where: { status: "pending" } }),
    db.approvalRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: { action: true },
    }),
    db.call.count({ where: { scheduledAt: { gte: todayStart } } }),
    db.call.findMany({
      where: { scheduledAt: { gte: todayStart } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      select: { inviteeName: true, eventType: true, scheduledAt: true },
    }),
    db.paymentDue.count({
      where: { status: { in: ["due", "awaiting_kane"] } },
    }),
    db.staffTodo.count({
      where: { status: "open", dueAt: { lt: new Date() } },
    }),
    db.contentAsset.count({ where: { state: "awaiting_kane" } }),
    db.subscription.count({ where: { status: "past_due" } }),
  ]);

  const lines: string[] = [
    `<b>TFP TO-DO</b> | ${esc(dubaiDateLabel())}`,
    "",
  ];

  let n = 1;

  // 1. P1 alerts (protected — always first)
  lines.push(`<b>${n}. P1 ALERTS</b> · ${openP1} open`);
  if (p1Titles.length === 0) {
    lines.push("— none");
  } else {
    for (const a of p1Titles) {
      lines.push(`— ${esc(a.ruleId)} · ${esc(a.title)}`);
    }
  }
  n += 1;

  // 2. Approvals
  lines.push(`<b>${n}. APPROVALS</b> · ${approvals} pending`);
  if (pendingApprovalRows.length === 0) {
    lines.push("— none");
  } else {
    for (const a of pendingApprovalRows) {
      lines.push(`— ${esc(a.action)}`);
    }
  }
  n += 1;

  // 3. Calls
  lines.push(`<b>${n}. CALLS TODAY</b> · ${calls}`);
  if (callRows.length === 0) {
    lines.push("— none booked");
  } else {
    for (const c of callRows) {
      const t = c.scheduledAt.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Dubai",
        hour: "2-digit",
        minute: "2-digit",
      });
      lines.push(
        `— ${esc(t)} ${esc(c.inviteeName ?? "invitee")} · ${esc(c.eventType ?? "call")}`,
      );
    }
  }
  n += 1;

  // 4. Money dues
  lines.push(
    `<b>${n}. MONEY DUES</b> · ${dues} due/awaiting Kane · past-due subs ${pastDueSubs}`,
  );
  lines.push("— /admin/money");
  n += 1;

  // 5. Team overdue
  lines.push(`<b>${n}. TEAM OVERDUE</b> · ${overdueTodos} open past due`);
  lines.push("— /admin/team");
  n += 1;

  // 6. Content
  lines.push(
    `<b>${n}. CONTENT</b> · ${contentAwaiting} awaiting Kane — /admin/content`,
  );
  n += 1;

  // 7. Meta review
  lines.push(`<b>${n}. META REVIEW</b> · check top spenders + ROAS — /admin/meta`);
  n += 1;

  // 8. Clients
  lines.push(
    `<b>${n}. CLIENTS</b> · attention + onboarding — /admin/clients · /admin/coaching`,
  );

  return lines.join("\n");
}

/** Part 03 §3 — 11-section daily report (UK English, Telegram HTML-safe). */
export async function buildDailyReport() {
  const y = yesterdayUtc();
  const todayStart = startOfUtcDay();
  const since7 = new Date(todayStart);
  since7.setUTCDate(since7.getUTCDate() - 7);
  const dueWindow = new Date(todayStart);
  dueWindow.setUTCDate(dueWindow.getUTCDate() + 7);

  const [
    snap,
    team,
    leads7,
    pays7,
    failed7,
    openP1,
    openP2,
    openP1Rows,
    adRows,
    stockCount,
    lowStock,
    openFulfilment,
    callsToday,
    contentAwaiting,
    approvalsPending,
    cashDue7,
  ] = await Promise.all([
    db.dailySnapshot.findUnique({ where: { date: y } }),
    getTeamMonitorSnapshot(),
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
    db.alert.findMany({
      where: { status: "open", severity: "p1" },
      orderBy: { firedAt: "asc" },
      take: 5,
      select: { ruleId: true, title: true },
    }),
    db.adDaily.findMany({
      where: { date: { gte: since7 } },
      orderBy: { spendPence: "desc" },
    }),
    db.stockItem.count(),
    db.stockItem.findMany({
      where: { daysOfCover: { not: null } },
      orderBy: { daysOfCover: "asc" },
      take: 3,
      select: { title: true, daysOfCover: true, sku: true },
    }),
    db.fulfilment.count({ where: { fulfilledAt: null } }),
    db.call.findMany({
      where: { scheduledAt: { gte: todayStart } },
      orderBy: { scheduledAt: "asc" },
      take: 8,
      select: {
        inviteeName: true,
        eventType: true,
        scheduledAt: true,
        outcome: true,
      },
    }),
    db.contentAsset.count({ where: { state: "awaiting_kane" } }),
    db.approvalRequest.count({ where: { status: "pending" } }),
    db.paymentDue.aggregate({
      where: {
        status: { in: ["due", "awaiting_kane"] },
        dueDate: { lte: dueWindow },
      },
      _sum: { amountPence: true },
      _count: true,
    }),
  ]);

  // Top Meta ad sets by spend (7d), click vs incremental ROAS
  const bySet = new Map<
    string,
    { name: string; spend: number; value7d: number; valueIncr: number }
  >();
  for (const row of adRows) {
    const cur = bySet.get(row.adSetId) ?? {
      name: row.adSetName,
      spend: 0,
      value7d: 0,
      valueIncr: 0,
    };
    cur.spend += row.spendPence;
    cur.value7d += row.purchaseValue7dPence;
    cur.valueIncr += row.purchaseValueIncrPence;
    bySet.set(row.adSetId, cur);
  }
  const topSets = [...bySet.values()]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  const teamLines = team.map((person) => {
    const kpiBit =
      person.latestKpis.length === 0
        ? "KPIs n/a"
        : person.latestKpis
            .slice(0, 3)
            .map((k) => `${k.kpiId}=${k.value}`)
            .join(", ");
    return `${esc(person.name)}: todos ${person.openTodos} (overdue ${person.overdueTodos}) · reports ${person.pendingReports} · ${esc(kpiBit)}`;
  });

  const moneyLines = snap
    ? [
        `Revenue: ${withLabel(formatGbp(snap.revenuePence), "calculated")}`,
        `Ad spend: ${withLabel(formatGbp(snap.adSpendPence), "verified")}`,
        `aMER: ${withLabel(
          snap.amer != null ? `${snap.amer.toFixed(2)}x` : na(),
          "calculated",
        )}`,
        `Contribution: ${withLabel(formatGbp(snap.contributionPence), "calculated")}`,
      ]
    : [na("Yesterday snapshot not measurable yet")];

  const cashLine =
    snap?.cashBalancePence != null
      ? withLabel(formatGbp(snap.cashBalancePence), "recorded")
      : na("Cash balance not measurable yet");

  const duePence = cashDue7._sum.amountPence;
  const dueLine =
    cashDue7._count > 0 && duePence != null
      ? withLabel(
          `${formatGbp(duePence)} across ${cashDue7._count} item(s)`,
          "recorded",
        )
      : na("No dues recorded for next 7 days");

  const funnelLine =
    leads7 + pays7 + failed7 > 0
      ? `Leads ${leads7} · Payments ${pays7} · Failed ${failed7} (verified)`
      : na("Funnel events not measurable yet");

  const metaLines =
    topSets.length === 0
      ? [na("AdDaily not measurable yet")]
      : topSets.map((s) => {
          const clickRoas = s.spend ? (s.value7d / s.spend).toFixed(2) : "—";
          const incrRoas = s.spend ? (s.valueIncr / s.spend).toFixed(2) : "—";
          return `${esc(s.name)} · spend ${formatGbp(s.spend)} · 7d click ROAS ${clickRoas}x · incr ROAS ${incrRoas}x (verified)`;
        });

  const alertLines =
    openP1 + openP2 === 0
      ? ["No open alerts"]
      : [
          `Open P1: ${openP1} · Open P2: ${openP2}`,
          ...openP1Rows.map((a) => `— ${esc(a.ruleId)} · ${esc(a.title)}`),
        ];

  const stockLines =
    stockCount === 0
      ? [na("Stock not measurable yet")]
      : [
          `SKUs tracked: ${stockCount} · Open unfulfilled: ${openFulfilment} (verified)`,
          ...(lowStock.length === 0
            ? ["Lowest cover: n/a"]
            : lowStock.map(
                (s) =>
                  `Lowest: ${esc(s.title)} · ${s.daysOfCover?.toFixed(0) ?? "—"} days (${esc(s.sku)})`,
              )),
        ];

  const callLines =
    callsToday.length === 0
      ? ["No calls booked today"]
      : callsToday.map((c) => {
          const t = c.scheduledAt.toLocaleTimeString("en-GB", {
            timeZone: "Asia/Dubai",
            hour: "2-digit",
            minute: "2-digit",
          });
          return `${esc(t)} · ${esc(c.inviteeName ?? "invitee")} · ${esc(c.eventType ?? "call")} · ${esc(c.outcome)}`;
        });

  return [
    `<b>TFP DAILY</b> | ${esc(dubaiDateLabel())}`,
    "",
    "<b>1. Money yesterday</b>",
    ...moneyLines,
    "",
    "<b>2. Cash / runway (recorded)</b>",
    `Cash: ${cashLine}`,
    `Due next 7 days: ${dueLine}`,
    "",
    "<b>3. Funnel 7d</b>",
    funnelLine,
    "",
    "<b>4. Meta ad sets (top spenders 7d)</b>",
    ...metaLines,
    "",
    "<b>5. Alerts open</b>",
    ...alertLines,
    "",
    "<b>6. Stock / fulfilment</b>",
    ...stockLines,
    "",
    "<b>7. Calls today</b>",
    ...callLines,
    "",
    "<b>8. Team desks</b>",
    ...(teamLines.length ? teamLines : [na("Team desks not measurable yet")]),
    "",
    "<b>9. Content awaiting Kane</b>",
    contentAwaiting > 0
      ? `${contentAwaiting} asset(s) awaiting Kane — /admin/content`
      : "None awaiting Kane",
    "",
    "<b>10. Approvals pending</b>",
    approvalsPending > 0
      ? `${approvalsPending} pending — /admin/alerts`
      : "None pending",
    "",
    "<b>11. Decide / links</b>",
    "Command /admin · Funnel /admin/growth/funnel · Meta /admin/meta · Money /admin/money · Team /admin/team",
  ].join("\n");
}
