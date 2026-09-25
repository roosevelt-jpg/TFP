import "server-only";

import { db } from "@/db";
import { formatGbp } from "@/lib/admin/format";
import { getTeamMonitorSnapshot } from "@/lib/admin/team-monitor";
import { dubaiWeekStartMonday } from "@/lib/content/social-manager";
import { ContentState } from "@/lib/content/states";
import { getNathanLayer1Checklist } from "@/lib/meta/layer1-checklist";
import { calculateBreakEvenAmer } from "@/lib/metrics/economics";

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

function ageHours(from: Date, now = new Date()) {
  return Math.max(0, Math.round((now.getTime() - from.getTime()) / 3_600_000));
}

function platformBucket(platform: string): "ig" | "tiktok" | "shorts" | "youtube" | "other" {
  const p = platform.toLowerCase();
  if (p.includes("instagram") || p === "ig") return "ig";
  if (p.includes("tiktok") || p === "tt") return "tiktok";
  if (p.includes("short")) return "shorts";
  if (p.includes("youtube") || p === "yt") return "youtube";
  return "other";
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
  const yEnd = new Date(y);
  yEnd.setUTCDate(yEnd.getUTCDate() + 1);
  const todayStart = startOfUtcDay();
  const now = new Date();
  const since7 = new Date(todayStart);
  since7.setUTCDate(since7.getUTCDate() - 7);
  const dueWindow = new Date(todayStart);
  dueWindow.setUTCDate(dueWindow.getUTCDate() + 7);
  const next48h = new Date(now.getTime() + 48 * 3_600_000);
  const silentBefore = new Date(now.getTime() - 3 * 24 * 3_600_000);
  const completeWindow = new Date(now.getTime() - 14 * 24 * 3_600_000);
  const mtdStart = startOfUtcDay();
  mtdStart.setUTCDate(1);
  const weekStart = dubaiWeekStartMonday();

  const [
    snap,
    team,
    revenueByLine,
    cashDue7,
    openP1Rows,
    suppOrders,
    lowStock,
    callsMtd,
    coachingCashMtd,
    pendingOnboarding,
    trainingActive,
    trainingJoins,
    trainingCancels,
    trainingMrr,
    trainingSilent,
    trainingCompletions,
    layer1,
    economics,
    adRows,
    changeEvents,
    emailRows,
    highIntentWaiting,
    highIntentTotal,
    highIntentReplied,
    ukFulfilments,
    openFulfilment,
    oldestOpen,
    financeUploadToday,
    lemoniCallsConfirmed,
    lemoniCallsBooked,
    referralApprovals,
    affiliateCodes,
    connectorErrors,
    asimShipped,
    asimGaps,
    postedYesterday,
    scheduledNext48,
    awaitingKane,
    inEdit,
    weeklyPlan,
    bestMetrics,
    pendingDecisions,
  ] = await Promise.all([
    db.dailySnapshot.findUnique({ where: { date: y } }),
    getTeamMonitorSnapshot(),
    db.warehouseOrder.groupBy({
      by: ["businessLine"],
      where: { paidAt: { gte: y, lt: yEnd } },
      _sum: { netPence: true },
    }),
    db.paymentDue.aggregate({
      where: {
        status: { in: ["due", "awaiting_kane"] },
        dueDate: { lte: dueWindow },
      },
      _sum: { amountPence: true },
      _count: true,
    }),
    db.alert.findMany({
      where: { status: { in: ["open", "acknowledged"] }, severity: "p1" },
      orderBy: { firedAt: "asc" },
      take: 8,
      select: { ruleId: true, title: true, firedAt: true, payload: true },
    }),
    db.warehouseOrder.findMany({
      where: {
        businessLine: "supplements",
        paidAt: { gte: y, lt: yEnd },
      },
      select: {
        netPence: true,
        refundedPence: true,
        isNewCustomer: true,
        isStack: true,
      },
    }),
    db.stockItem.findMany({
      where: { daysOfCover: { not: null } },
      orderBy: { daysOfCover: "asc" },
      take: 1,
      select: { title: true, daysOfCover: true, sku: true },
    }),
    db.call.groupBy({
      by: ["outcome"],
      where: { scheduledAt: { gte: mtdStart } },
      _count: true,
    }),
    db.warehousePayment.aggregate({
      where: { businessLine: "coaching", paidAt: { gte: mtdStart } },
      _sum: { amountPence: true },
    }),
    db.programmeEnrolment.count({
      where: { line: "coaching", status: "pending_onboarding" },
    }),
    db.programmeEnrolment.count({
      where: { line: "training", status: "active" },
    }),
    db.programmeEnrolment.count({
      where: {
        line: "training",
        status: "active",
        startDate: { gte: y, lt: yEnd },
      },
    }),
    db.programmeEnrolment.count({
      where: {
        line: "training",
        status: "cancelled",
        updatedAt: { gte: y, lt: yEnd },
      },
    }),
    db.programmeEnrolment.aggregate({
      where: { line: "training", status: "active" },
      _sum: { pricePence: true },
    }),
    db.programmeEnrolment.count({
      where: {
        line: "training",
        status: "active",
        updatedAt: { lte: silentBefore },
      },
    }),
    db.programmeEnrolment.count({
      where: {
        line: "training",
        status: "completed",
        updatedAt: { gte: completeWindow },
      },
    }),
    getNathanLayer1Checklist(),
    calculateBreakEvenAmer(),
    db.adDaily.findMany({
      where: { date: { gte: since7 } },
      orderBy: { spendPence: "desc" },
    }),
    db.changeEvent.findMany({
      where: {
        objectType: "ad_set",
        changeType: { not: "observed" },
        occurredAt: { gte: since7 },
      },
      orderBy: { occurredAt: "desc" },
      take: 5,
      select: { objectId: true, changeType: true },
    }),
    db.emailDaily.findMany({
      where: { date: { gte: since7 } },
      orderBy: { date: "desc" },
      take: 40,
    }),
    db.leadThread.count({
      where: { highIntent: true, lastReplyAt: null },
    }),
    db.leadThread.count({ where: { highIntent: true } }),
    db.leadThread.count({
      where: { highIntent: true, lastReplyAt: { not: null } },
    }),
    db.fulfilment.findMany({
      where: { fulfilledAt: { not: null }, region: "UK" },
      take: 200,
      select: { hoursToDispatch: true },
    }),
    db.fulfilment.count({ where: { fulfilledAt: null } }),
    db.fulfilment.findFirst({
      where: { fulfilledAt: null },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    }),
    db.financeTxn.count({
      where: {
        date: todayStart,
        uploadBatch: { startsWith: "leah-" },
      },
    }),
    db.call.count({
      where: {
        scheduledAt: { gte: todayStart },
        outcome: { in: ["held", "closed", "booked"] },
      },
    }),
    db.call.count({ where: { scheduledAt: { gte: todayStart } } }),
    db.approvalRequest.count({
      where: {
        status: "pending",
        action: { contains: "referral", mode: "insensitive" },
      },
    }),
    db.affiliateCode.count(),
    db.connectorRun.count({
      where: {
        OR: [
          { status: "error" },
          {
            lastSuccessAt: {
              lt: new Date(now.getTime() - 6 * 3_600_000),
            },
          },
        ],
      },
    }),
    db.fulfilment.count({
      where: { fulfilledAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } },
    }),
    db.fulfilment.count({
      where: { fulfilledAt: null, componentGaps: { gt: 0 } },
    }),
    db.postCard.findMany({
      where: {
        status: { in: [ContentState.published, "posted"] },
        updatedAt: { gte: y, lt: yEnd },
      },
      select: { platform: true },
    }),
    db.postCard.count({
      where: {
        status: { in: [ContentState.scheduled, "scheduled"] },
        scheduledAt: { gte: now, lt: next48h },
        held: false,
      },
    }),
    db.postCard.count({
      where: {
        status: { in: [ContentState.awaitingKane, "awaiting_kane"] },
      },
    }),
    db.contentAsset.count({
      where: { state: { in: [ContentState.inEdit, "editing"] } },
    }),
    db.weeklyPostingPlan.findUnique({ where: { weekStart } }),
    db.postMetric.findMany({
      where: { capturedAt: { gte: since7 } },
      orderBy: { views: "desc" },
      take: 5,
      include: {
        postCard: { select: { account: true, platform: true } },
      },
    }),
    db.approvalRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: {
        action: true,
        reach: true,
        reversible: true,
        specialistVerdict: true,
      },
    }),
  ]);

  // ── 1. MONEY LINE ──────────────────────────────────────────────
  const lineMap = new Map(
    revenueByLine.map((r) => [r.businessLine, r._sum.netPence ?? 0]),
  );
  const suppRev = lineMap.get("supplements") ?? 0;
  const coachRev = lineMap.get("coaching") ?? 0;
  const trainRev = lineMap.get("training") ?? 0;
  const totalRev =
    snap?.revenuePence ??
    (suppRev + coachRev + trainRev > 0
      ? suppRev + coachRev + trainRev
      : null);

  const moneyHasData =
    totalRev != null ||
    snap != null ||
    revenueByLine.length > 0;

  const moneyLines = moneyHasData
    ? [
        `Revenue yesterday: Supplements ${withLabel(formatGbp(suppRev), "verified")} | Coaching ${withLabel(formatGbp(coachRev), "verified")} | Training ${withLabel(formatGbp(trainRev), "verified")} | Total ${withLabel(formatGbp(totalRev ?? 0), "calculated")}`,
        `Ad spend ${withLabel(formatGbp(snap?.adSpendPence ?? 0), "verified")} | aMER ${withLabel(snap?.amer != null ? `${snap.amer.toFixed(2)}x` : na(), "calculated")} (break-even ${economics.breakEvenAmer.toFixed(2)}x) | Contribution ${withLabel(formatGbp(snap?.contributionPence ?? 0), "calculated")}`,
        `Cash (from Leah's template): ${
          snap?.cashBalancePence != null
            ? withLabel(formatGbp(snap.cashBalancePence), "recorded")
            : na("Cash balance not measurable yet")
        } | Due next 7 days: ${
          cashDue7._count > 0 && cashDue7._sum.amountPence != null
            ? withLabel(formatGbp(cashDue7._sum.amountPence), "recorded")
            : na("No dues recorded")
        }`,
      ]
    : [na("Money yesterday not measurable yet")];

  // ── 2. OPEN URGENT ─────────────────────────────────────────────
  const urgentLines =
    openP1Rows.length === 0
      ? ["no change"]
      : openP1Rows.map((a) => {
          const payload = a.payload as { owner?: string } | null;
          const owner = payload?.owner ?? "Kane";
          return `— ${esc(a.ruleId)} · ${esc(a.title)} · owner ${esc(owner)} · age ${ageHours(a.firedAt)}h`;
        });

  // ── 3. SUPPLEMENTS ─────────────────────────────────────────────
  const suppLines =
    suppOrders.length === 0
      ? [na("Supplements yesterday not measurable yet")]
      : (() => {
          const orders = suppOrders.length;
          const newC = suppOrders.filter((o) => o.isNewCustomer).length;
          const returning = orders - newC;
          const net = suppOrders.reduce((s, o) => s + o.netPence, 0);
          const aov = orders ? Math.round(net / orders) : 0;
          const stacks = suppOrders.filter((o) => o.isStack).length;
          const refunds = suppOrders.reduce((s, o) => s + o.refundedPence, 0);
          const stockLine =
            lowStock[0] != null
              ? `Stock: lowest cover ${esc(lowStock[0].title)} ${lowStock[0].daysOfCover?.toFixed(0) ?? "—"} days`
              : na("Stock cover not measurable yet");
          return [
            `Orders ${orders} (new ${newC} / returning ${returning}) | AOV ${formatGbp(aov)} | Stack orders ${stacks} | Refunds ${formatGbp(refunds)}`,
            stockLine,
          ];
        })();

  // ── 4. COACHING ────────────────────────────────────────────────
  const callCounts = { booked: 0, held: 0, closed: 0 };
  for (const row of callsMtd) {
    if (row.outcome === "booked") callCounts.booked += row._count;
    else if (row.outcome === "held") callCounts.held += row._count;
    else if (row.outcome === "closed") callCounts.closed += row._count;
  }
  const coachingCash = coachingCashMtd._sum.amountPence ?? 0;
  const coachingTarget = 8_500_000;
  const coachingHas =
    callsMtd.length > 0 || coachingCash > 0 || pendingOnboarding > 0;
  const coachingLines = coachingHas
    ? [
        `Calls booked ${callCounts.booked} | held ${callCounts.held} | closed ${callCounts.closed} | cash collected ${formatGbp(coachingCash)} | MTD ${formatGbp(coachingCash)} vs target ${formatGbp(coachingTarget)}`,
        `Payments awaiting onboarding: ${pendingOnboarding}`,
      ]
    : [na("Coaching programme not measurable yet")];

  // ── 5. TRAINING ────────────────────────────────────────────────
  const trainingHas =
    trainingActive +
      trainingJoins +
      trainingCancels +
      trainingSilent +
      trainingCompletions >
      0 ||
    (trainingMrr._sum.pricePence ?? 0) > 0;
  const trainingLines = trainingHas
    ? [
        `Active ${trainingActive} | joins ${trainingJoins} | cancels ${trainingCancels} | MRR ${formatGbp(trainingMrr._sum.pricePence ?? 0)} | silent 3+ days ${trainingSilent} | completions in 14 days ${trainingCompletions}`,
      ]
    : [na("Training programme not measurable yet")];

  // ── 6. META ────────────────────────────────────────────────────
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
  const topSets = [...bySet.entries()]
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 5);
  const changeBySet = new Map<string, number>();
  for (const ev of changeEvents) {
    changeBySet.set(ev.objectId, (changeBySet.get(ev.objectId) ?? 0) + 1);
  }
  const outstanding = layer1.total - layer1.metCount;
  const metaLines =
    topSets.length === 0
      ? [
          `Nathan ladder: Layer 1 (${layer1.metCount}/${layer1.total})`,
          na("AdDaily not measurable yet"),
          `Ladder exit criteria outstanding: ${outstanding}`,
        ]
      : [
          `Nathan ladder: Layer 1 (${layer1.metCount}/${layer1.total})`,
          ...topSets.map(([id, s]) => {
            const clickRoas = s.spend ? (s.value7d / s.spend).toFixed(2) : "—";
            const incrRoas = s.spend ? (s.valueIncr / s.spend).toFixed(2) : "—";
            const changes = changeBySet.get(id) ?? 0;
            return `${esc(s.name)} · spend ${formatGbp(s.spend)} · 7d click ROAS ${clickRoas}x · incr ROAS ${incrRoas}x · change events ${changes}`;
          }),
          `Ladder exit criteria outstanding: ${outstanding}`,
        ];

  // ── 7. EMAIL + DMS ─────────────────────────────────────────────
  const emailSends = emailRows.filter((e) => e.recipients > 0);
  const emailRevenue = emailRows.reduce((s, e) => s + e.revenuePence, 0);
  const revPerSend =
    emailSends.length > 0
      ? formatGbp(Math.round(emailRevenue / emailSends.length))
      : null;
  const flowsLive = emailRows.filter(
    (e) => e.kind === "flow" && /live|active/i.test(e.status ?? ""),
  ).length;
  const flowsTotal = emailRows.filter((e) => e.kind === "flow").length;
  const responseGapPct =
    highIntentTotal > 0
      ? Math.round(((highIntentTotal - highIntentReplied) / highIntentTotal) * 100)
      : null;
  const emailHas =
    emailRows.length > 0 || highIntentWaiting > 0 || highIntentTotal > 0;
  const emailLines = emailHas
    ? [
        `Klaviyo revenue per send ${revPerSend ?? na()} | flows live ${flowsTotal > 0 ? `${flowsLive}/${flowsTotal}` : na()}`,
        `High-intent DMs waiting ${highIntentWaiting} | response gap ${responseGapPct != null ? `${responseGapPct}%` : na()}`,
      ]
    : [na("Email + DMs not measurable yet")];

  // ── 8. FULFILMENT ──────────────────────────────────────────────
  const within24 = ukFulfilments.filter(
    (f) => f.hoursToDispatch != null && f.hoursToDispatch <= 24,
  ).length;
  const dispatchPct = ukFulfilments.length
    ? Math.round((within24 / ukFulfilments.length) * 100)
    : null;
  const oldestHours =
    oldestOpen?.paidAt != null ? ageHours(oldestOpen.paidAt) : null;
  const fulfilHas =
    ukFulfilments.length > 0 || openFulfilment > 0 || oldestOpen != null;
  const fulfilLines = fulfilHas
    ? [
        `UK dispatched within 24h: ${dispatchPct != null ? `${dispatchPct}%` : na()} | open unfulfilled ${openFulfilment} | oldest ${oldestHours != null ? `${oldestHours} hours` : na()}`,
      ]
    : [na("Fulfilment not measurable yet")];

  // ── 9. TEAM ────────────────────────────────────────────────────
  const kpiOf = (personKey: string, match: RegExp) => {
    const person = team.find((t) => t.personKey === personKey);
    const hit = person?.latestKpis.find((k) => match.test(k.kpiId));
    return hit?.value ?? null;
  };
  const teamLines = [
    `Leah: template on time ${financeUploadToday > 0 ? "Y" : "N"} | CS backlog ${kpiOf("leah", /unanswered|high-intent/i) ?? na()} | payments due current ${kpiOf("leah", /past-due|subscription/i) === "0" ? "Y" : kpiOf("leah", /past-due|subscription/i) != null ? "N" : na()}`,
    `Lemoni: calls confirmed ${lemoniCallsBooked > 0 ? `${lemoniCallsConfirmed}/${lemoniCallsBooked}` : na()} | referral approvals pending ${referralApprovals} | register % ${affiliateCodes > 0 ? na("see scorecard") : na()}`,
    `Indigo: workflow failures 24h ${connectorErrors} | escalation router OK ${connectorErrors === 0 ? "Y" : "N"}`,
    `Asim: 24h dispatch ${dispatchPct != null ? `${dispatchPct}%` : na()} | shipped ${asimShipped} | component gaps ${asimGaps}`,
  ];

  // ── 10. CONTENT ────────────────────────────────────────────────
  const posted = { ig: 0, tiktok: 0, shorts: 0, youtube: 0 };
  for (const card of postedYesterday) {
    const b = platformBucket(card.platform);
    if (b === "other") continue;
    posted[b] += 1;
  }
  const wppYn = weeklyPlan?.status === "agreed" ? "Y" : "N";
  const best = bestMetrics[0];
  const bestLine = best
    ? `Best post last 7 days: ${esc(best.postCard.account)} · ${esc(best.postCard.platform)} · views ${best.views} · follows ${na("follows not tracked")}`
    : na("Best post last 7 days not measurable yet");
  const contentPostedAny =
    posted.ig + posted.tiktok + posted.shorts + posted.youtube > 0;
  const contentLines = [
    contentPostedAny ||
    scheduledNext48 + awaitingKane + inEdit > 0 ||
    weeklyPlan != null
      ? `Posted yesterday: IG ${posted.ig} | TikTok ${posted.tiktok} | Shorts ${posted.shorts} | YouTube ${posted.youtube}`
      : na("Content activity not measurable yet"),
    `Scheduled next 48h ${scheduledNext48} | awaiting Kane's approval ${awaitingKane} | in edit ${inEdit} | Weekly Posting Plan agreed ${wppYn}`,
    bestLine,
  ];

  // ── 11. DECISIONS (max 3) ──────────────────────────────────────
  const decisionLines =
    pendingDecisions.length === 0
      ? ["no change"]
      : pendingDecisions.map((d, i) => {
          return [
            `${i + 1}. WHAT: ${esc(d.action)}`,
            `   MONEY/REACH: ${esc(d.reach ?? na())}`,
            `   REVERSIBLE?: ${d.reversible ? "Y" : "N"}`,
            `   RECOMMENDATION: ${esc(d.specialistVerdict ?? "review on /admin/alerts")}`,
            `   CHECK: specialist`,
            `   [Approve] [Reject] [Ask]`,
          ].join("\n");
        });

  return [
    `<b>TFP DAILY</b> | ${esc(dubaiDateLabel())}`,
    "",
    "<b>1. MONEY LINE</b>",
    ...moneyLines,
    "",
    "<b>2. OPEN URGENT</b>",
    ...urgentLines,
    "",
    "<b>3. SUPPLEMENTS</b>",
    ...suppLines,
    "",
    "<b>4. COACHING PROGRAMME</b>",
    ...coachingLines,
    "",
    "<b>5. TRAINING PROGRAMME</b>",
    ...trainingLines,
    "",
    "<b>6. META (Nathan ladder)</b>",
    ...metaLines,
    "",
    "<b>7. EMAIL + DMS</b>",
    ...emailLines,
    "",
    "<b>8. FULFILMENT</b>",
    ...fulfilLines,
    "",
    "<b>9. TEAM</b>",
    ...teamLines,
    "",
    "<b>10. CONTENT</b>",
    ...contentLines,
    "",
    "<b>11. DECISIONS FOR KANE TODAY</b> (max 3)",
    ...decisionLines,
  ].join("\n");
}
