import "server-only";

import { db } from "@/db";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import { calculateBreakEvenAmer } from "@/lib/metrics/economics";
import { resolveThreshold } from "@/lib/alerts/rules-config";
import { getWhatsAppCoachHealth } from "@/lib/training/coach-health";
import type { Prisma } from "@/generated/prisma/client";

function dubaiHour() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value ?? 12);
}

function dubaiWeekday() {
  // 0=Sun … 6=Sat in en-US narrow numeric via formatToParts isn't reliable;
  // use weekday long + map, or get UTC-adjusted Dubai calendar date.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "short",
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 1;
}

function dubaiDateString(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
  }).format(d);
}

/** Quiet hours: 23:00–07:00 Dubai — only P1 wakes. */
function inQuietHours() {
  const hour = dubaiHour();
  return hour >= 23 || hour < 7;
}

/** Store operating window used for R1 (Dubai business hours). */
function inDubaiBusinessHours() {
  const hour = dubaiHour();
  return hour >= 8 && hour < 23;
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

function daysAgoUtc(n: number) {
  const d = startOfUtcDay();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60_000);
}

/**
 * Create or refresh an alert thread. Same threadKey while open/acknowledged
 * updates title/payload instead of spamming a new row. P1 may re-notify.
 */
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

  const kaneChatId = await getKaneTelegramChatId();
  const mayNotify =
    input.severity === "p1" || input.bypassQuiet || !inQuietHours();

  if (existing) {
    const alert = await db.alert.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        payload: input.payload ?? existing.payload ?? {},
        severity: input.severity,
        ruleId: input.ruleId,
      },
    });

    // Re-notify on P1 so Kane sees refreshed critical state, not only create.
    if (kaneChatId && mayNotify && input.severity === "p1") {
      await sendTelegramMessage({
        chatId: kaneChatId,
        text: `${input.severity.toUpperCase()} ${input.ruleId} · ${alert.title}`,
      });
    }
    return alert;
  }

  const alert = await db.alert.create({
    data: {
      ruleId: input.ruleId,
      severity: input.severity,
      title: input.title,
      payload: input.payload ?? {},
      threadKey: input.threadKey,
    },
  });

  if (kaneChatId && mayNotify) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: `${input.severity.toUpperCase()} ${input.ruleId} · ${alert.title}`,
    });
  }
  return alert;
}

const COMPLAINT_RE =
  /\b(scam|refund|angry|not arrived|disgusting|ripoff|rip.?off|complaint|terrible|worst)\b/i;
const HEALTH_RE =
  /\b(side effect|adverse|reaction|hospital|allergic|ill|nausea|rash|medical)\b/i;
const LEGAL_RE =
  /\b(trading standards|asa\b|mhra|fsa\b|hmrc|solicitor|legal action|lawsuit|ofcom)\b/i;
const IMPORTANT_SENDER_RE =
  /\b(stripe|shopify|meta|facebook|klaviyo|google|revolut|hmrc|companies house|fulfilfulfil|fulfilichannel|fulfil.?fulfil)\b/i;
const IMPORTANT_URGENT_RE =
  /\b(payment failed|suspension|suspend|legal|deadline|chargeback|dispute)\b/i;
const META_BILLING_RE =
  /\b(billing|payment failed|ad account.*(disabled|restricted)|billing.?failure|payment.?method)\b/i;

function intervalMonths(interval: string): number | null {
  const s = interval.toLowerCase();
  if (/year|annual|12\s*month/.test(s)) return 12;
  if (/6\s*month|semi/.test(s)) return 6;
  if (/3\s*month|quarter/.test(s)) return 3;
  if (/month|30\s*day/.test(s)) return 1;
  if (/week|7\s*day/.test(s)) return 0.25;
  if (/day/.test(s)) return 1 / 30;
  return null;
}

function nameImpliedMonths(product: string): number | null {
  const m = product.match(/(\d+)\s*month/i);
  if (m) return Number(m[1]);
  if (/annual|yearly|12\s*mo/i.test(product)) return 12;
  if (/quarter/i.test(product)) return 3;
  if (/\bmonthly\b/i.test(product)) return 1;
  return null;
}

export type AlertEvalSummary = {
  stockAlerts: number;
  stockCritical: number;
  dmAlerts: number;
  pastDue: number;
  storeQuiet: boolean;
  connectorStale: number;
  py1: number;
  ca1: boolean;
  ca4: boolean;
  sy1Cluster: boolean;
  noShows: number;
  onboardingIncomplete: number;
  contentStuck: number;
  m1: number;
  m3: number;
  m5: boolean;
  fired: number;
  // Extended Part 03 coverage counters (additive — do not remove above fields)
  r2: boolean;
  r3: boolean;
  py3: number;
  py4: number;
  py5: number;
  m2: boolean;
  m4: number;
  l2: number;
  c1: number;
  c2: number;
  c3: number;
  sy2: boolean;
  sy3: boolean;
  sy4: number;
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  ca2: boolean;
  ca3: number;
  cl1: number;
  cl2: number;
  e1: number;
  e2: number;
  t1: boolean;
  t2: number;
  ctExtra: number;
};

export async function evaluateAlertRules(): Promise<AlertEvalSummary> {
  const thresholds = await db.alertThreshold.findMany({
    where: { enabled: true },
  });
  const byRule = Object.fromEntries(thresholds.map((t) => [t.ruleId, t]));
  const dubaiDate = dubaiDateString();
  const summary: AlertEvalSummary = {
    stockAlerts: 0,
    stockCritical: 0,
    dmAlerts: 0,
    pastDue: 0,
    storeQuiet: false,
    connectorStale: 0,
    py1: 0,
    ca1: false,
    ca4: false,
    sy1Cluster: false,
    noShows: 0,
    onboardingIncomplete: 0,
    contentStuck: 0,
    m1: 0,
    m3: 0,
    m5: false,
    fired: 0,
    r2: false,
    r3: false,
    py3: 0,
    py4: 0,
    py5: 0,
    m2: false,
    m4: 0,
    l2: 0,
    c1: 0,
    c2: 0,
    c3: 0,
    sy2: false,
    sy3: false,
    sy4: 0,
    k1: 0,
    k2: 0,
    k3: 0,
    k4: 0,
    ca2: false,
    ca3: 0,
    cl1: 0,
    cl2: 0,
    e1: 0,
    e2: 0,
    t1: false,
    t2: 0,
    ctExtra: 0,
  };

  async function track(promise: Promise<unknown>): Promise<void> {
    const result = await promise;
    if (result) summary.fired += 1;
  }

  const thr = (ruleId: string, fallback?: string) =>
    resolveThreshold(byRule, ruleId, fallback);

  // ── Stock ST1 / ST2 ──────────────────────────────────────────────
  const stockLowThreshold = thr("ST1");
  const stockCriticalThreshold = thr("ST2");
  const stockItems = await db.stockItem.findMany({
    where: { daysOfCover: { not: null, lt: stockLowThreshold } },
  });
  for (const item of stockItems) {
    const cover = item.daysOfCover!;
    if (cover === 0 || cover < stockCriticalThreshold) {
      summary.stockCritical += 1;
      await track(
        fireAlert({
          ruleId: "ST2",
          severity: "p1",
          title: `${item.title} critical cover: ${cover.toFixed(0)} days`,
          threadKey: `ST2-${item.sku}`,
          payload: { sku: item.sku, daysOfCover: cover },
          bypassQuiet: true,
        }),
      );
    } else {
      summary.stockAlerts += 1;
      await track(
        fireAlert({
          ruleId: "ST1",
          severity: "p2",
          title: `${item.title} at ${cover.toFixed(0)} days of cover`,
          threadKey: `ST1-${item.sku}`,
          payload: { sku: item.sku, daysOfCover: cover },
        }),
      );
    }
  }

  // ── L1 — high-intent DM SLA ──────────────────────────────────────
  const replyWindowMin = thr("L1");
  const cutoff = new Date(Date.now() - replyWindowMin * 60_000);
  const unanswered = await db.leadThread.findMany({
    where: {
      highIntent: true,
      lastReplyAt: null,
      lastInboundAt: { lte: cutoff },
    },
  });
  summary.dmAlerts = unanswered.length;
  for (const thread of unanswered) {
    await track(
      fireAlert({
        ruleId: "L1",
        severity: "p1",
        title: `High-intent ${thread.channel} unanswered: ${thread.snippet ?? thread.externalId}`,
        threadKey: `L1-${thread.channel}-${thread.externalId}`,
        payload: { threadId: thread.id },
        bypassQuiet: true,
      }),
    );
  }

  // ── L2 — booked call at risk (next 24h, no confirmation reply) ───
  const now = new Date();
  const in24h = new Date(Date.now() + 24 * 60 * 60_000);
  const atRiskCalls = await db.call.findMany({
    where: {
      outcome: "booked",
      scheduledAt: { gte: now, lte: in24h },
    },
    take: 40,
  });
  for (const call of atRiskCalls) {
    // Confirmation proxy: LeadThread reply for invitee email, or none.
    let confirmed = false;
    if (call.inviteeEmail) {
      const thread = await db.leadThread.findFirst({
        where: {
          OR: [
            { contactName: { contains: call.inviteeEmail, mode: "insensitive" } },
            { snippet: { contains: call.inviteeEmail, mode: "insensitive" } },
          ],
          lastReplyAt: { not: null },
        },
      });
      confirmed = !!thread;
    }
    if (!confirmed) {
      summary.l2 += 1;
      await track(
        fireAlert({
          ruleId: "L2",
          severity: "p2",
          title: `Call at risk — no confirmation: ${call.inviteeName ?? call.inviteeEmail ?? call.id}`,
          threadKey: `L2-${call.id}`,
          payload: {
            callId: call.id,
            scheduledAt: call.scheduledAt.toISOString(),
          },
        }),
      );
    }
  }

  // ── PY2 — past_due subscriptions ─────────────────────────────────
  const pastDue = await db.subscription.findMany({
    where: { status: "past_due" },
    include: { customer: { select: { email: true, name: true } } },
    take: 40,
  });
  summary.pastDue = pastDue.length;
  for (const sub of pastDue) {
    await track(
      fireAlert({
        ruleId: "PY2",
        severity: "p1",
        title: `Payment failed — ${sub.customer.name} (${sub.customer.email})`,
        threadKey: `PY2-${sub.stripeSubscriptionId}`,
        payload: { subscriptionId: sub.id },
        bypassQuiet: true,
      }),
    );
  }

  // ── PY3 — disputes / chargebacks ─────────────────────────────────
  const disputed = await db.warehousePayment.findMany({
    where: { disputeFlag: true },
    take: 40,
    orderBy: { updatedAt: "desc" },
  });
  summary.py3 = disputed.length;
  for (const row of disputed) {
    await track(
      fireAlert({
        ruleId: "PY3",
        severity: "p1",
        title: `Dispute / chargeback £${(row.amountPence / 100).toFixed(0)} (${row.stripeChargeId ?? row.id})`,
        threadKey: `PY3-${row.id}`,
        payload: { paymentId: row.id, amountPence: row.amountPence },
        bypassQuiet: true,
      }),
    );
  }

  // ── PY4 — refund over cap ────────────────────────────────────────
  const refundCapPounds = thr("PY4");
  const refundCapPence = refundCapPounds * 100;
  const bigRefunds = await db.warehouseOrder.findMany({
    where: { refundedPence: { gt: refundCapPence } },
    take: 40,
    orderBy: { updatedAt: "desc" },
  });
  summary.py4 = bigRefunds.length;
  for (const order of bigRefunds) {
    await track(
      fireAlert({
        ruleId: "PY4",
        severity: "p1",
        title: `Refund £${(order.refundedPence / 100).toFixed(0)} over £${refundCapPounds} cap — ${order.orderName ?? order.shopifyOrderId}`,
        threadKey: `PY4-${order.shopifyOrderId}`,
        payload: {
          orderId: order.id,
          refundedPence: order.refundedPence,
        },
        bypassQuiet: true,
      }),
    );
  }

  // ── PY5 — billing interval vs product name mismatch ──────────────
  const mirrors = await db.subscriptionMirror.findMany({ take: 100 });
  for (const mirror of mirrors) {
    const billed = intervalMonths(mirror.interval);
    const named = nameImpliedMonths(mirror.product);
    if (billed != null && named != null && Math.abs(billed - named) > 0.01) {
      summary.py5 += 1;
      await track(
        fireAlert({
          ruleId: "PY5",
          severity: "p1",
          title: `Billing interval mismatch — "${mirror.product}" bills ${mirror.interval}`,
          threadKey: `PY5-${mirror.contractId}`,
          payload: {
            contractId: mirror.contractId,
            product: mirror.product,
            interval: mirror.interval,
          },
          bypassQuiet: true,
        }),
      );
    }
  }

  // ── R1 — store quiet ─────────────────────────────────────────────
  const quietHours = thr("R1");
  if (inDubaiBusinessHours()) {
    const since = hoursAgo(quietHours);
    const recentOrders = await db.warehouseOrder.count({
      where: {
        businessLine: "supplements",
        OR: [{ paidAt: { gte: since } }, { createdAt: { gte: since } }],
      },
    });
    if (recentOrders === 0) {
      summary.storeQuiet = true;
      await track(
        fireAlert({
          ruleId: "R1",
          severity: "p1",
          title: `Store quiet — no Shopify warehouse orders in ${quietHours}h`,
          threadKey: `R1-${dubaiDate}`,
          payload: { quietHours },
          bypassQuiet: true,
        }),
      );
    }
  }

  // ── R2 — revenue behind by 18:00 Dubai ────────────────────────────
  if (dubaiHour() >= 18) {
    const pctOfAvg = thr("R2") / 100;
    const todayStart = startOfUtcDay();
    const todayAgg = await db.warehouseOrder.aggregate({
      where: { paidAt: { gte: todayStart } },
      _sum: { netPence: true },
    });
    let todayRevenue = todayAgg._sum.netPence ?? 0;
    const todaySnap = await db.dailySnapshot.findUnique({
      where: { date: todayStart },
    });
    if (todaySnap && todaySnap.revenuePence > todayRevenue) {
      todayRevenue = todaySnap.revenuePence;
    }

    const sameWeekdayRevenues: number[] = [];
    for (let weeksBack = 1; weeksBack <= 8 && sameWeekdayRevenues.length < 4; weeksBack++) {
      const d = daysAgoUtc(weeksBack * 7);
      // 7*n days ago ≈ same weekday; prefer dailySnapshot when present.
      const snap = await db.dailySnapshot.findUnique({ where: { date: d } });
      if (snap) {
        sameWeekdayRevenues.push(snap.revenuePence);
        continue;
      }
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      const agg = await db.warehouseOrder.aggregate({
        where: { paidAt: { gte: d, lt: next } },
        _sum: { netPence: true },
      });
      if ((agg._sum.netPence ?? 0) > 0) {
        sameWeekdayRevenues.push(agg._sum.netPence ?? 0);
      }
    }

    if (sameWeekdayRevenues.length >= 2) {
      const avg =
        sameWeekdayRevenues.reduce((a, b) => a + b, 0) /
        sameWeekdayRevenues.length;
      const floor = avg * pctOfAvg;
      if (todayRevenue < floor) {
        summary.r2 = true;
        await track(
          fireAlert({
            ruleId: "R2",
            severity: "p2",
            title: `Revenue behind — today £${(todayRevenue / 100).toFixed(0)} < ${(pctOfAvg * 100).toFixed(0)}% of trailing same-weekday avg £${(avg / 100).toFixed(0)}`,
            threadKey: `R2-${dubaiDate}`,
            payload: {
              todayRevenuePence: todayRevenue,
              avgPence: Math.round(avg),
              samples: sameWeekdayRevenues.length,
            },
          }),
        );
      }
    }
  }

  // ── R3 — no training programme payment 48h ───────────────────────
  const r3Hours = thr("R3");
  const r3Since = hoursAgo(r3Hours);
  const trainingPayCount = await db.warehousePayment.count({
    where: {
      businessLine: "training",
      status: { in: ["paid", "succeeded", "complete"] },
      OR: [{ paidAt: { gte: r3Since } }, { createdAt: { gte: r3Since } }],
    },
  });
  const trainingEnrolCount = await db.programmeEnrolment.count({
    where: {
      line: "training",
      createdAt: { gte: r3Since },
    },
  });
  // Fire only when training-specific signals exist historically but none recently.
  const everTraining = await db.programmeEnrolment.count({
    where: { line: "training" },
  });
  if (
    everTraining > 0 &&
    trainingPayCount === 0 &&
    trainingEnrolCount === 0
  ) {
    summary.r3 = true;
    await track(
      fireAlert({
        ruleId: "R3",
        severity: "p2",
        title: `No training programme payment in ${r3Hours}h`,
        threadKey: `R3-${dubaiDate}`,
        payload: { hours: r3Hours },
      }),
    );
  }

  // ── SY5 — connector stale / error ────────────────────────────────
  const staleHours = thr("SY5");
  const staleBefore = hoursAgo(staleHours);
  const connectors = await db.connectorRun.findMany({
    where: { status: { not: "phased" } },
  });
  for (const run of connectors) {
    const isError = run.status === "error";
    const isStale =
      !run.lastSuccessAt || run.lastSuccessAt.getTime() < staleBefore.getTime();
    if (!isError && !isStale) continue;
    summary.connectorStale += 1;
    await track(
      fireAlert({
        ruleId: "SY5",
        severity: "p2",
        title: isError
          ? `Connector ${run.sourceId} (${run.name}) error: ${run.lastError ?? "unknown"}`
          : `Connector ${run.sourceId} (${run.name}) stale — last success ${run.lastSuccessAt ? run.lastSuccessAt.toISOString() : "never"}`,
        threadKey: `SY5-${run.sourceId}`,
        payload: {
          sourceId: run.sourceId,
          status: run.status,
          lastSuccessAt: run.lastSuccessAt?.toISOString() ?? null,
        },
      }),
    );
  }

  // ── SY2 — train subdomain / booking (best-effort live check) ─────
  try {
    const trainUrl = "https://train.theformulaperformance.com/";
    const res = await fetch(trainUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    const ok = res.status > 0 && res.status < 500;
    if (!ok) {
      summary.sy2 = true;
      await track(
        fireAlert({
          ruleId: "SY2",
          severity: "p1",
          title: `Training site down — train. returned ${res.status}`,
          threadKey: `SY2-train-${dubaiDate}`,
          payload: { status: res.status },
          bypassQuiet: true,
        }),
      );
    }
  } catch {
    summary.sy2 = true;
    await track(
      fireAlert({
        ruleId: "SY2",
        severity: "p1",
        title: `Training site unreachable — train.theformulaperformance.com`,
        threadKey: `SY2-train-${dubaiDate}`,
        bypassQuiet: true,
      }),
    );
  }

  // ── SY3 / SY4 — n8n connector (S6) ───────────────────────────────
  const n8n = connectors.find((c) => c.sourceId === "S6");
  if (n8n?.status === "error" || /escalation/i.test(n8n?.lastError ?? "")) {
    summary.sy3 = true;
    await track(
      fireAlert({
        ruleId: "SY3",
        severity: "p1",
        title: `Escalation Router / n8n error: ${n8n?.lastError ?? "S6 error"}`,
        threadKey: "SY3-n8n",
        payload: { lastError: n8n?.lastError ?? null },
        bypassQuiet: true,
      }),
    );
  }
  const hourAgo = hoursAgo(1);
  const n8nFailAlerts = await db.alert.count({
    where: {
      OR: [
        { threadKey: { startsWith: "N8N-" } },
        { ruleId: { in: ["SY2", "SY3", "SY4"] }, title: { contains: "n8n", mode: "insensitive" } },
      ],
      firedAt: { gte: hourAgo },
      status: { in: ["open", "acknowledged"] },
    },
  });
  if (n8nFailAlerts >= 3) {
    summary.sy4 = n8nFailAlerts;
    await track(
      fireAlert({
        ruleId: "SY4",
        severity: "p2",
        title: `${n8nFailAlerts} n8n workflow failures in the last hour`,
        threadKey: `SY4-${dubaiDate}-${Math.floor(Date.now() / 3_600_000)}`,
        payload: { count: n8nFailAlerts },
      }),
    );
  }

  // ── PY1 — high-ticket awaiting onboarding ────────────────────────
  const py1Pending = await db.programmeEnrolment.findMany({
    where: { line: "coaching", status: "pending_onboarding" },
    include: { person: { select: { name: true, email: true } } },
    take: 40,
  });
  const dayAgo = hoursAgo(24);
  const py1Buyers = await db.customer.findMany({
    where: {
      createdAt: { lte: dayAgo },
      coaching: { is: null },
      purchases: { some: { status: "paid", amountTotal: { gte: 50_000 } } },
    },
    select: { id: true, email: true, name: true },
    take: 40,
  });
  summary.py1 = py1Pending.length + py1Buyers.length;
  for (const row of py1Pending) {
    await track(
      fireAlert({
        ruleId: "PY1",
        severity: "p1",
        title: `High-ticket ${row.tier ?? "coaching"} paid — manual onboarding required (${row.person.name ?? row.person.email ?? row.personId})`,
        threadKey: `PY1-enrol-${row.id}`,
        payload: { enrolmentId: row.id, personId: row.personId },
        bypassQuiet: true,
      }),
    );
  }
  for (const buyer of py1Buyers) {
    await track(
      fireAlert({
        ruleId: "PY1",
        severity: "p1",
        title: `High-ticket paid — no coaching profile / onboarding (${buyer.name} / ${buyer.email})`,
        threadKey: `PY1-cust-${buyer.id}`,
        payload: { customerId: buyer.id },
        bypassQuiet: true,
      }),
    );
  }

  // ── CA1 / CA2 — cash warning / critical ──────────────────────────
  const ca1ThresholdPounds = byRule.CA1?.value ?? thr("CA1");
  const ca2ThresholdPounds = thr("CA2");
  const latestSnap = await db.dailySnapshot.findFirst({
    where: { cashBalancePence: { not: null } },
    orderBy: { date: "desc" },
  });
  const cashPence = latestSnap?.cashBalancePence ?? null;
  if (cashPence != null) {
    if (cashPence < ca2ThresholdPounds * 100) {
      summary.ca2 = true;
      await track(
        fireAlert({
          ruleId: "CA2",
          severity: "p1",
          title: `Cash critical £${(cashPence / 100).toFixed(0)} below £${ca2ThresholdPounds.toFixed(0)}`,
          threadKey: `CA2-${latestSnap!.date.toISOString().slice(0, 10)}`,
          payload: {
            cashBalancePence: cashPence,
            thresholdPounds: ca2ThresholdPounds,
          },
          bypassQuiet: true,
        }),
      );
    } else if (ca1ThresholdPounds > 0 && cashPence < ca1ThresholdPounds * 100) {
      summary.ca1 = true;
      await track(
        fireAlert({
          ruleId: "CA1",
          severity: "p2",
          title: `Cash balance £${(cashPence / 100).toFixed(0)} below £${ca1ThresholdPounds.toFixed(0)} threshold (recorded)`,
          threadKey: `CA1-${latestSnap!.date.toISOString().slice(0, 10)}`,
          payload: {
            cashBalancePence: cashPence,
            thresholdPounds: ca1ThresholdPounds,
          },
        }),
      );
    }
  }

  // ── CA3 — payment due vs cash ────────────────────────────────────
  if (cashPence != null) {
    const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    const dues = await db.paymentDue.findMany({
      where: {
        status: { in: ["due", "awaiting_kane"] },
        dueDate: { lte: weekOut },
      },
    });
    for (const due of dues) {
      if (due.amountPence > cashPence) {
        summary.ca3 += 1;
        await track(
          fireAlert({
            ruleId: "CA3",
            severity: "p1",
            title: `Payment due £${(due.amountPence / 100).toFixed(0)} to ${due.payee} exceeds cash £${(cashPence / 100).toFixed(0)}`,
            threadKey: `CA3-${due.id}`,
            payload: {
              paymentDueId: due.id,
              amountPence: due.amountPence,
              cashBalancePence: cashPence,
            },
            bypassQuiet: true,
          }),
        );
      }
    }
  }

  // ── CA4 — Leah finance upload missing today ──────────────────────
  const financeToday = await db.financeTxn.count({
    where: {
      date: new Date(dubaiDate),
      uploadBatch: { startsWith: "leah-" },
    },
  });
  if (financeToday === 0 && dubaiHour() >= 13) {
    summary.ca4 = true;
    await track(
      fireAlert({
        ruleId: "CA4",
        severity: "p2",
        title: `Leah finance CSV missing for ${dubaiDate}`,
        threadKey: `CA4-${dubaiDate}`,
      }),
    );
  }

  // ── SY1 — open uptime / system cluster ───────────────────────────
  const openUptime = await db.alert.count({
    where: {
      ruleId: { startsWith: "SY" },
      status: "open",
    },
  });
  if (openUptime >= 3) {
    summary.sy1Cluster = true;
    await track(
      fireAlert({
        ruleId: "SY1",
        severity: "p1",
        title: `${openUptime} open system/uptime alerts`,
        threadKey: "SY1-cluster",
        bypassQuiet: true,
      }),
    );
  }

  // ── Calls CL1 / CL2 / CL5 ────────────────────────────────────────
  const start = startOfUtcDay();
  const newBookings = await db.call.findMany({
    where: { createdAt: { gte: start }, outcome: "booked" },
    take: 40,
  });
  summary.cl1 = newBookings.length;
  for (const call of newBookings) {
    const inside24h =
      call.scheduledAt.getTime() - Date.now() < 24 * 60 * 60_000 &&
      call.scheduledAt.getTime() >= Date.now();
    await track(
      fireAlert({
        ruleId: "CL1",
        severity: inside24h ? "p1" : "p2",
        title: `New booking — ${call.inviteeName ?? call.inviteeEmail ?? call.eventType ?? call.id}`,
        threadKey: `CL1-${call.id}`,
        payload: {
          callId: call.id,
          scheduledAt: call.scheduledAt.toISOString(),
        },
        bypassQuiet: inside24h,
      }),
    );
  }

  const cancellations = await db.call.findMany({
    where: {
      outcome: { in: ["cancelled", "rescheduled"] },
      updatedAt: { gte: start },
    },
    take: 40,
  });
  summary.cl2 = cancellations.length;
  for (const call of cancellations) {
    await track(
      fireAlert({
        ruleId: "CL2",
        severity: "p2",
        title: `Call ${call.outcome} — ${call.inviteeName ?? call.inviteeEmail ?? call.id}`,
        threadKey: `CL2-${call.id}`,
        payload: { callId: call.id, outcome: call.outcome },
      }),
    );
  }

  const noShows = await db.call.count({
    where: { outcome: "no_show", scheduledAt: { gte: start } },
  });
  summary.noShows = noShows;
  if (noShows > 0) {
    await track(
      fireAlert({
        ruleId: "CL5",
        severity: "p2",
        title: `${noShows} call no-show(s) today`,
        threadKey: `CL5-${dubaiDate}`,
        payload: { noShows },
      }),
    );
  }

  // ── ON1 — incomplete onboarding > 24h ────────────────────────────
  const incomplete = await db.customer.count({
    where: {
      createdAt: { lte: dayAgo },
      coaching: { is: null },
      purchases: { some: { status: "paid" } },
    },
  });
  summary.onboardingIncomplete = incomplete;
  if (incomplete > 0) {
    await track(
      fireAlert({
        ruleId: "ON1",
        severity: "p2",
        title: `${incomplete} paid buyer(s) missing coaching profile >24h`,
        threadKey: `ON1-${dubaiDate}`,
      }),
    );
  }

  // ── Complaints C1 / C2 / C3 from LeadThread snippets ─────────────
  const recentThreads = await db.leadThread.findMany({
    where: { lastInboundAt: { gte: daysAgoUtc(3) } },
    take: 80,
    orderBy: { lastInboundAt: "desc" },
  });
  for (const thread of recentThreads) {
    const text = `${thread.snippet ?? ""} ${thread.contactName ?? ""}`;
    if (HEALTH_RE.test(text)) {
      summary.c2 += 1;
      await track(
        fireAlert({
          ruleId: "C2",
          severity: "p1",
          title: `Health / adverse reaction mention — ${thread.channel}: ${thread.snippet?.slice(0, 80) ?? thread.externalId}`,
          threadKey: `C2-${thread.channel}-${thread.externalId}`,
          payload: { threadId: thread.id },
          bypassQuiet: true,
        }),
      );
    } else if (LEGAL_RE.test(text)) {
      summary.c3 += 1;
      await track(
        fireAlert({
          ruleId: "C3",
          severity: "p1",
          title: `Legal / regulatory mention — ${thread.channel}: ${thread.snippet?.slice(0, 80) ?? thread.externalId}`,
          threadKey: `C3-${thread.channel}-${thread.externalId}`,
          payload: { threadId: thread.id },
          bypassQuiet: true,
        }),
      );
    } else if (COMPLAINT_RE.test(text)) {
      summary.c1 += 1;
      await track(
        fireAlert({
          ruleId: "C1",
          severity: "p2",
          title: `Complaint signal — ${thread.channel}: ${thread.snippet?.slice(0, 80) ?? thread.externalId}`,
          threadKey: `C1-${thread.channel}-${thread.externalId}`,
          payload: { threadId: thread.id },
        }),
      );
    }
  }

  // ── E1 / E2 — email channel threads (best-effort classifications) ─
  const emailThreads = await db.leadThread.findMany({
    where: {
      channel: "email",
      lastInboundAt: { gte: daysAgoUtc(2) },
    },
    take: 40,
  });
  for (const thread of emailThreads) {
    const blob = `${thread.contactName ?? ""} ${thread.snippet ?? ""}`;
    if (IMPORTANT_SENDER_RE.test(blob)) {
      const urgent = IMPORTANT_URGENT_RE.test(blob);
      summary.e1 += 1;
      await track(
        fireAlert({
          ruleId: "E1",
          severity: urgent ? "p1" : "p2",
          title: `Important sender email: ${thread.snippet?.slice(0, 100) ?? thread.externalId}`,
          threadKey: `E1-${thread.externalId}`,
          payload: { threadId: thread.id },
          bypassQuiet: urgent,
        }),
      );
    }
    if (
      thread.lastReplyAt == null &&
      /kane|please reply|needs? (your|kane)/i.test(blob)
    ) {
      summary.e2 += 1;
      await track(
        fireAlert({
          ruleId: "E2",
          severity: "p2",
          title: `Needs Kane reply: ${thread.snippet?.slice(0, 100) ?? thread.externalId}`,
          threadKey: `E2-${thread.externalId}`,
          payload: { threadId: thread.id },
        }),
      );
    }
  }

  // Pending Gmail draft approvals as E2 proxy when triage created them.
  const gmailApprovals = await db.approvalRequest.findMany({
    where: {
      status: "pending",
      action: { contains: "drafted reply", mode: "insensitive" },
    },
    take: 20,
  });
  for (const ap of gmailApprovals) {
    summary.e2 += 1;
    await track(
      fireAlert({
        ruleId: "E2",
        severity: "p2",
        title: `Gmail needs Kane: ${ap.action.slice(0, 120)}`,
        threadKey: `E2-appr-${ap.id}`,
        payload: { approvalId: ap.id },
      }),
    );
  }

  // ── T1 / T2 — training silent share, coach health & week 6 ───────
  const silentDays = thr("T1_SILENT_DAYS");
  const silentPctCap = thr("T1_SILENT");
  const silentBefore = hoursAgo(silentDays * 24);
  const activeTraining = await db.programmeEnrolment.count({
    where: { line: "training", status: "active" },
  });
  const silentMembers = await db.programmeEnrolment.count({
    where: {
      line: "training",
      status: "active",
      updatedAt: { lte: silentBefore },
    },
  });
  const coachHealth = await getWhatsAppCoachHealth();
  const silentSharePct =
    activeTraining > 0 ? (silentMembers / activeTraining) * 100 : 0;
  const silentOverCap =
    activeTraining > 0 && silentSharePct >= silentPctCap;
  const coachDegraded = coachHealth.status === "degraded";
  if (silentOverCap || coachDegraded) {
    summary.t1 = true;
    const parts: string[] = [];
    if (silentOverCap) {
      parts.push(
        `Silent ${silentMembers}/${activeTraining} (${silentSharePct.toFixed(0)}%) ≥ ${silentPctCap}%`,
      );
    }
    if (coachDegraded) {
      parts.push(`WhatsApp coach ${coachHealth.status}: ${coachHealth.detail}`);
    }
    await track(
      fireAlert({
        ruleId: "T1",
        severity: "p2",
        title: parts.join(" · "),
        threadKey: `T1-${dubaiDate}`,
        payload: {
          silentMembers,
          activeTraining,
          coachHealth: coachHealth.status,
          coachDetail: coachHealth.detail,
        },
      }),
    );
  }

  const week6 = await db.programmeEnrolment.findMany({
    where: { line: "training", status: "active", currentWeek: 6 },
    include: { person: { select: { name: true, email: true } } },
    take: 40,
  });
  summary.t2 = week6.length;
  for (const row of week6) {
    await track(
      fireAlert({
        ruleId: "T2",
        severity: "p2",
        title: `Week 6 of 8 — renewal: ${row.person.name ?? row.person.email ?? row.personId}`,
        threadKey: `T2-${row.id}`,
        payload: { enrolmentId: row.id, currentWeek: row.currentWeek },
      }),
    );
  }

  // ── Content CT1–CT12 (best-effort from asset / card / channel) ───
  const ct1Hours = thr("CT1_HOURS");
  const uploadedStuck = await db.contentAsset.count({
    where: {
      state: { in: ["uploaded", "draft"] },
      updatedAt: { lte: hoursAgo(ct1Hours) },
    },
  });
  // Keep legacy CT1 awaiting_kane >48h as contentStuck signal + fire CT1 for uploads
  const twoDaysAgo = hoursAgo(48);
  const stuckContent = await db.contentAsset.count({
    where: {
      state: "awaiting_kane",
      updatedAt: { lte: twoDaysAgo },
    },
  });
  summary.contentStuck = stuckContent + uploadedStuck;
  if (uploadedStuck > 0) {
    await track(
      fireAlert({
        ruleId: "CT1",
        severity: "p2",
        title: `${uploadedStuck} upload(s) not tagged >${ct1Hours}h`,
        threadKey: `CT1-${dubaiDate}`,
      }),
    );
  }

  const ct2Hours = thr("CT2_HOURS");
  const awaitingKane = await db.postCard.findMany({
    where: {
      status: "awaiting_kane",
      OR: [
        { scheduledAt: { lte: new Date(Date.now() + ct2Hours * 60 * 60_000) } },
        { scheduledAt: null, updatedAt: { lte: hoursAgo(12) } },
      ],
    },
    take: 40,
  });
  for (const card of awaitingKane) {
    summary.ctExtra += 1;
    await track(
      fireAlert({
        ruleId: "CT2",
        severity: "p2",
        title: `Post awaiting Kane — ${card.platform}/${card.account}`,
        threadKey: `CT2-${card.id}`,
        payload: { postCardId: card.id },
      }),
    );
  }

  const complianceFails = await db.postCard.findMany({
    where: {
      compliancePass: false,
      status: {
        in: [
          "compliance",
          "changes_requested",
          "awaiting_kane",
          "scheduled",
        ],
      },
    },
    take: 30,
  });
  for (const card of complianceFails) {
    summary.ctExtra += 1;
    const scheduled = card.status === "scheduled";
    await track(
      fireAlert({
        ruleId: "CT3",
        severity: scheduled ? "p1" : "p2",
        title: `Compliance fail — ${card.platform} ${card.complianceResult?.slice(0, 80) ?? card.id}`,
        threadKey: `CT3-${card.id}`,
        payload: { postCardId: card.id },
        bypassQuiet: scheduled,
      }),
    );
  }

  const publishFails = await db.postCard.findMany({
    where: { status: { in: ["failed", "rejected"] }, updatedAt: { gte: daysAgoUtc(2) } },
    take: 30,
  });
  for (const card of publishFails) {
    summary.ctExtra += 1;
    await track(
      fireAlert({
        ruleId: "CT4",
        severity: "p1",
        title: `Publish failed — ${card.platform}/${card.account}`,
        threadKey: `CT4-${card.id}`,
        payload: { postCardId: card.id },
        bypassQuiet: true,
      }),
    );
  }

  // CT5 — posted live today (P3 informational)
  const liveToday = await db.postCard.count({
    where: {
      status: { in: ["published", "posted"] },
      updatedAt: { gte: start },
      postUrl: { not: null },
    },
  });
  if (liveToday > 0) {
    summary.ctExtra += 1;
    await track(
      fireAlert({
        ruleId: "CT5",
        severity: "p3",
        title: `${liveToday} post(s) live today`,
        threadKey: `CT5-${dubaiDate}`,
        payload: { count: liveToday },
      }),
    );
  }

  // CT6 — calendar gap: tomorrow slots empty by 18:00 Dubai
  if (dubaiHour() >= 18) {
    const tomorrowStart = startOfUtcDay();
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 1);
    const scheduledTomorrow = await db.postCard.count({
      where: {
        status: "scheduled",
        scheduledAt: { gte: tomorrowStart, lt: tomorrowEnd },
      },
    });
    if (scheduledTomorrow === 0) {
      summary.ctExtra += 1;
      await track(
        fireAlert({
          ruleId: "CT6",
          severity: "p2",
          title: `Calendar gap — no scheduled posts for tomorrow`,
          threadKey: `CT6-${dubaiDate}`,
        }),
      );
    }
  }

  // CT7 — platform strike: failed cards with strike-like compliance text
  const strikeCards = await db.postCard.findMany({
    where: {
      OR: [
        { complianceResult: { contains: "strike", mode: "insensitive" } },
        { complianceResult: { contains: "violation", mode: "insensitive" } },
        { complianceResult: { contains: "removed", mode: "insensitive" } },
      ],
      updatedAt: { gte: daysAgoUtc(7) },
    },
    take: 20,
  });
  for (const card of strikeCards) {
    summary.ctExtra += 1;
    await track(
      fireAlert({
        ruleId: "CT7",
        severity: "p1",
        title: `Platform strike / removal — ${card.platform}/${card.account}`,
        threadKey: `CT7-${card.id}`,
        payload: { postCardId: card.id },
        bypassQuiet: true,
      }),
    );
  }

  const tokenDays = thr("CT8_DAYS");
  const tokenCutoff = new Date(Date.now() + tokenDays * 24 * 60 * 60_000);
  const expiringChannels = await db.channel.findMany({
    where: {
      tokenExpiresAt: { not: null, lte: tokenCutoff },
    },
  });
  for (const ch of expiringChannels) {
    summary.ctExtra += 1;
    await track(
      fireAlert({
        ruleId: "CT8",
        severity: "p2",
        title: `Token expiring — ${ch.platform}/${ch.account} by ${ch.tokenExpiresAt?.toISOString().slice(0, 10)}`,
        threadKey: `CT8-${ch.id}`,
        payload: { channelId: ch.id },
      }),
    );
  }

  const limitPct = thr("CT9_PCT") / 100;
  const channelsWithLimit = await db.channel.findMany({
    where: { publishingLimit: { not: null } },
  });
  for (const ch of channelsWithLimit) {
    const limit = ch.publishingLimit!;
    const weekAgo = daysAgoUtc(7);
    const published = await db.postCard.count({
      where: {
        platform: ch.platform,
        account: ch.account,
        status: { in: ["published", "posted"] },
        updatedAt: { gte: weekAgo },
      },
    });
    if (limit > 0 && published / limit >= limitPct) {
      summary.ctExtra += 1;
      await track(
        fireAlert({
          ruleId: "CT9",
          severity: "p2",
          title: `Publish limit ${Math.round((published / limit) * 100)}% — ${ch.platform}/${ch.account}`,
          threadKey: `CT9-${ch.id}-${dubaiDate}`,
          payload: { published, limit },
        }),
      );
    }
  }

  // CT10 — negative comment spike (PostMetric comments vs recent avg)
  const recentMetrics = await db.postMetric.findMany({
    where: { capturedAt: { gte: hoursAgo(2) } },
    include: { postCard: { select: { id: true, account: true, platform: true } } },
    take: 50,
  });
  const mult = thr("CT10_MULT");
  if (recentMetrics.length > 0) {
    const baseline = await db.postMetric.aggregate({
      where: { capturedAt: { gte: daysAgoUtc(14), lt: hoursAgo(2) } },
      _avg: { comments: true },
    });
    const avg = baseline._avg.comments ?? 0;
    for (const m of recentMetrics) {
      if (avg > 0 && m.comments > avg * mult) {
        summary.ctExtra += 1;
        await track(
          fireAlert({
            ruleId: "CT10",
            severity: "p1",
            title: `Negative comment spike — ${m.postCard.platform}/${m.postCard.account} (${m.comments} vs avg ${avg.toFixed(1)})`,
            threadKey: `CT10-${m.postCardId}`,
            payload: { comments: m.comments, avg },
            bypassQuiet: true,
          }),
        );
      }
    }
  }

  // CT11 — plan not agreed by Monday 18:00 Dubai
  const dubaiDow = dubaiWeekday(); // 0=Sun … 1=Mon
  if (dubaiDow === 1 && dubaiHour() >= 18) {
    const weekStart = startOfUtcDay();
    const planApproval = await db.approvalRequest.count({
      where: {
        createdAt: { gte: weekStart },
        OR: [
          { action: { contains: "Weekly Posting Plan", mode: "insensitive" } },
          { action: { contains: "content plan", mode: "insensitive" } },
        ],
        status: { in: ["pending", "approved"] },
      },
    });
    const scheduledThisWeek = await db.postCard.count({
      where: {
        status: "scheduled",
        scheduledAt: { gte: weekStart },
      },
    });
    if (planApproval === 0 && scheduledThisWeek === 0) {
      summary.ctExtra += 1;
      await track(
        fireAlert({
          ruleId: "CT11",
          severity: "p2",
          title: `Weekly Posting Plan not agreed by Monday 18:00 Dubai`,
          threadKey: `CT11-${dubaiDate}`,
        }),
      );
    }
  }

  // CT12 — tomorrow's posts digest at 20:00 Dubai
  if (dubaiHour() === 20) {
    const tomorrowStart = startOfUtcDay();
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 1);
    const tomorrowPosts = await db.postCard.findMany({
      where: {
        status: { in: ["scheduled", "awaiting_kane"] },
        scheduledAt: { gte: tomorrowStart, lt: tomorrowEnd },
      },
      take: 20,
    });
    if (tomorrowPosts.length > 0) {
      summary.ctExtra += 1;
      await track(
        fireAlert({
          ruleId: "CT12",
          severity: "p3",
          title: `Tomorrow's posts — ${tomorrowPosts.length} scheduled (${tomorrowPosts.map((p) => p.platform).join(", ")})`,
          threadKey: `CT12-${dubaiDate}`,
          payload: { ids: tomorrowPosts.map((p) => p.id) },
        }),
      );
    }
  }

  // Also keep legacy awaiting_kane >48h as CT2-style stuck if no CT2 fired
  if (stuckContent > 0) {
    await track(
      fireAlert({
        ruleId: "CT2",
        severity: "p2",
        title: `${stuckContent} content asset(s) awaiting Kane >48h`,
        threadKey: `CT2-stuck-${dubaiDate}`,
      }),
    );
  }

  // ── Meta M1 / M2 / M3 / M4 / M5 ──────────────────────────────────
  const y = yesterdayUtc();
  const zeroPurchaseAds = await db.adDaily.findMany({
    where: {
      date: y,
      spendPence: { gt: 0 },
      purchases7d: 0,
      purchasesIncr: 0,
    },
  });
  summary.m1 = zeroPurchaseAds.length;
  for (const row of zeroPurchaseAds) {
    await track(
      fireAlert({
        ruleId: "M1",
        severity: "p1",
        title: `Ad set ${row.adSetName} spent with zero purchases (7d click + incr) yesterday`,
        threadKey: `M1-${row.adSetId}-${y.toISOString().slice(0, 10)}`,
        payload: {
          adSetId: row.adSetId,
          spendPence: row.spendPence,
        },
        bypassQuiet: true,
      }),
    );
  }

  // M2 — Meta billing failure from connector error text
  const metaConnector = connectors.find(
    (c) =>
      /meta|facebook|ads/i.test(c.name) ||
      /meta|facebook|S3/i.test(c.sourceId),
  );
  const metaErr = metaConnector?.lastError ?? "";
  if (
    metaConnector?.status === "error" &&
    META_BILLING_RE.test(metaErr)
  ) {
    summary.m2 = true;
    await track(
      fireAlert({
        ruleId: "M2",
        severity: "p1",
        title: `Meta payment / billing failure: ${metaErr.slice(0, 120)}`,
        threadKey: `M2-${dubaiDate}`,
        payload: { sourceId: metaConnector.sourceId, lastError: metaErr },
        bypassQuiet: true,
      }),
    );
  }

  // M3 — spend over daily cap (+15%)
  const dailyCapPounds = thr("M3");
  const overPct = thr("M3_OVER") / 100;
  const capPence = dailyCapPounds * 100 * (1 + overPct);
  const todaySpend = await db.adDaily.aggregate({
    where: { date: startOfUtcDay() },
    _sum: { spendPence: true },
  });
  const spendToday = todaySpend._sum.spendPence ?? 0;
  if (dailyCapPounds > 0 && spendToday > capPence) {
    summary.m3 = 1;
    await track(
      fireAlert({
        ruleId: "M3",
        severity: "p1",
        title: `Meta spend £${(spendToday / 100).toFixed(0)} over daily ceiling £${dailyCapPounds} (+${(overPct * 100).toFixed(0)}%)`,
        threadKey: `M3-${dubaiDate}`,
        payload: {
          spendPence: spendToday,
          capPounds: dailyCapPounds,
          overPct: overPct * 100,
        },
        bypassQuiet: true,
      }),
    );
  }

  // M4 — 3 clean days below break-even on BOTH 7d and incr
  const { breakEvenAmer } = await calculateBreakEvenAmer();
  if (breakEvenAmer > 0) {
    const last3 = [daysAgoUtc(1), daysAgoUtc(2), daysAgoUtc(3)];
    const rows3 = await db.adDaily.findMany({
      where: { date: { in: last3 }, spendPence: { gt: 0 } },
    });
    const bySet = new Map<string, typeof rows3>();
    for (const row of rows3) {
      const list = bySet.get(row.adSetId) ?? [];
      list.push(row);
      bySet.set(row.adSetId, list);
    }
    const windowStart = daysAgoUtc(3);
    for (const [adSetId, rows] of bySet) {
      const dates = new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
      if (dates.size < 3) continue;
      const allBelow = rows.every((r) => {
        const amer7 = r.spendPence > 0 ? r.purchaseValue7dPence / r.spendPence : 0;
        const amerIncr =
          r.spendPence > 0 ? r.purchaseValueIncrPence / r.spendPence : 0;
        return amer7 < breakEvenAmer && amerIncr < breakEvenAmer;
      });
      if (!allBelow) continue;
      const change = await db.changeEvent.findFirst({
        where: {
          objectType: "ad_set",
          objectId: adSetId,
          occurredAt: { gte: windowStart },
        },
      });
      if (change) continue;
      summary.m4 += 1;
      await track(
        fireAlert({
          ruleId: "M4",
          severity: "p2",
          title: `Ad set ${rows[0]?.adSetName ?? adSetId} below break-even (${breakEvenAmer.toFixed(2)}) on 7d + incr for 3 days`,
          threadKey: `M4-${adSetId}-${dubaiDate}`,
          payload: { adSetId, breakEvenAmer },
        }),
      );
    }
  }

  // M5 — fatigue: frequency >2 over 7d OR CTR drop 30% vs first week; min £30
  const freqCap = thr("M5_FREQ", "M5");
  const ctrDropPct = thr("M5_CTR_DROP") / 100;
  const minSpendPence = thr("M5_MIN_SPEND") * 100;
  const weekStart = daysAgoUtc(7);
  const weekRows = await db.adDaily.findMany({
    where: { date: { gte: weekStart }, spendPence: { gt: 0 } },
  });
  const byAdSetWeek = new Map<string, typeof weekRows>();
  for (const row of weekRows) {
    const list = byAdSetWeek.get(row.adSetId) ?? [];
    list.push(row);
    byAdSetWeek.set(row.adSetId, list);
  }
  for (const [adSetId, rows] of byAdSetWeek) {
    const spend = rows.reduce((s, r) => s + r.spendPence, 0);
    if (spend < minSpendPence) continue;
    const avgFreq =
      rows.reduce((s, r) => s + (r.frequency ?? 0), 0) /
      Math.max(1, rows.filter((r) => r.frequency != null).length);
    const freqHit =
      rows.some((r) => (r.frequency ?? 0) > freqCap) || avgFreq > freqCap;

    const withCtr = rows.filter((r) => r.ctr != null).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    let ctrHit = false;
    if (withCtr.length >= 4) {
      const firstWeekCtr =
        withCtr.slice(0, Math.min(7, Math.ceil(withCtr.length / 2))).reduce(
          (s, r) => s + (r.ctr ?? 0),
          0,
        ) / Math.min(7, Math.ceil(withCtr.length / 2));
      const recentCtr =
        withCtr.slice(-3).reduce((s, r) => s + (r.ctr ?? 0), 0) / 3;
      if (firstWeekCtr > 0 && recentCtr < firstWeekCtr * (1 - ctrDropPct)) {
        ctrHit = true;
      }
    }

    // Also compare to earliest available week of history for this ad set
    if (!ctrHit) {
      const earliest = await db.adDaily.findMany({
        where: { adSetId, ctr: { not: null }, spendPence: { gt: 0 } },
        orderBy: { date: "asc" },
        take: 7,
      });
      const recent = await db.adDaily.findMany({
        where: { adSetId, date: { gte: weekStart }, ctr: { not: null } },
        orderBy: { date: "desc" },
        take: 7,
      });
      if (earliest.length >= 3 && recent.length >= 3) {
        const firstAvg =
          earliest.reduce((s, r) => s + (r.ctr ?? 0), 0) / earliest.length;
        const recentAvg =
          recent.reduce((s, r) => s + (r.ctr ?? 0), 0) / recent.length;
        if (firstAvg > 0 && recentAvg < firstAvg * (1 - ctrDropPct)) {
          ctrHit = true;
        }
      }
    }

    if (freqHit || ctrHit) {
      summary.m5 = true;
      await track(
        fireAlert({
          ruleId: "M5",
          severity: "p3",
          title: `Ad fatigue — ${rows[0]?.adSetName ?? adSetId}${freqHit ? ` freq>${freqCap}` : ""}${ctrHit ? " CTR drop" : ""}`,
          threadKey: `M5-${adSetId}-${dubaiDate}`,
          payload: {
            adSetId,
            avgFreq,
            freqHit,
            ctrHit,
            spendPence: spend,
          },
        }),
      );
    }
  }

  // ── Klaviyo K1–K4 from EmailDaily / connector ────────────────────
  const klaviyo = connectors.find(
    (c) => c.sourceId === "S4" || /klaviyo/i.test(c.name),
  );
  if (klaviyo?.status === "error" && /flow|paused|draft|manual/i.test(klaviyo.lastError ?? "")) {
    summary.k1 += 1;
    await track(
      fireAlert({
        ruleId: "K1",
        severity: "p1",
        title: `Klaviyo flow stopped: ${klaviyo.lastError?.slice(0, 120)}`,
        threadKey: `K1-${dubaiDate}`,
        bypassQuiet: true,
      }),
    );
  }
  // K1 also from EmailDaily status
  const pausedFlows = await db.emailDaily.findMany({
    where: {
      kind: { in: ["flow", "Flow"] },
      status: { in: ["draft", "manual", "paused", "Draft", "Paused"] },
      date: { gte: daysAgoUtc(2) },
    },
    take: 20,
  });
  for (const row of pausedFlows) {
    summary.k1 += 1;
    await track(
      fireAlert({
        ruleId: "K1",
        severity: "p1",
        title: `Klaviyo flow not live — ${row.name} (${row.status})`,
        threadKey: `K1-${row.name}`,
        bypassQuiet: true,
      }),
    );
  }

  const k2Floor = thr("K2_RECIPIENTS");
  const dayAgoSnap = daysAgoUtc(1);
  const emptyCampaigns = await db.emailDaily.findMany({
    where: {
      kind: { contains: "campaign", mode: "insensitive" },
      recipients: { gte: k2Floor },
      revenuePence: 0,
      date: { lte: dayAgoSnap, gte: daysAgoUtc(3) },
    },
    take: 20,
  });
  for (const row of emptyCampaigns) {
    summary.k2 += 1;
    await track(
      fireAlert({
        ruleId: "K2",
        severity: "p2",
        title: `Klaviyo send £0 revenue after 24h — ${row.name} (${row.recipients} recipients)`,
        threadKey: `K2-${row.name}-${row.date.toISOString().slice(0, 10)}`,
        payload: { recipients: row.recipients },
      }),
    );
  }

  const bounceCap = thr("K3_BOUNCE") / 100;
  const spamCap = thr("K3_SPAM") / 100;
  const deliverability = await db.emailDaily.findMany({
    where: {
      date: { gte: daysAgoUtc(3) },
      OR: [
        { bounceRate: { gt: bounceCap } },
        { spamRate: { gt: spamCap } },
      ],
    },
    take: 20,
  });
  for (const row of deliverability) {
    summary.k3 += 1;
    await track(
      fireAlert({
        ruleId: "K3",
        severity: "p1",
        title: `Deliverability — ${row.name}: bounce ${((row.bounceRate ?? 0) * 100).toFixed(2)}% / spam ${((row.spamRate ?? 0) * 100).toFixed(3)}%`,
        threadKey: `K3-${row.name}-${row.date.toISOString().slice(0, 10)}`,
        bypassQuiet: true,
      }),
    );
  }

  const bigSends = await db.emailDaily.findMany({
    where: {
      date: { gte: daysAgoUtc(1) },
      recipients: { gte: k2Floor },
      kind: { contains: "campaign", mode: "insensitive" },
    },
    orderBy: { date: "desc" },
    take: 10,
  });
  if (bigSends.length >= 2) {
    summary.k4 = bigSends.length;
    await track(
      fireAlert({
        ruleId: "K4",
        severity: "p1",
        title: `Two+ large Klaviyo sends in 24h (${bigSends.length})`,
        threadKey: `K4-${dubaiDate}`,
        payload: { names: bigSends.map((s) => s.name) },
        bypassQuiet: true,
      }),
    );
  }

  return summary;
}
