import "server-only";

import { db } from "@/db";
import { STAFF_PEOPLE, type PersonKey } from "@/lib/admin/staff";
import { ContentState } from "@/lib/content/states";

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dubaiDateString(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
  }).format(d);
}

async function upsertKpi(
  personKey: PersonKey,
  kpiId: string,
  date: Date,
  value: string | number,
  source: string,
) {
  const v = String(value);
  await db.kpiValue.upsert({
    where: { personKey_kpiId_date: { personKey, kpiId, date } },
    create: {
      personKey,
      kpiId,
      date,
      value: v,
      source,
      label: "calculated",
    },
    update: {
      value: v,
      source,
      label: "calculated",
    },
  });
}

async function upsertNotMeasurable(
  personKey: PersonKey,
  kpiId: string,
  date: Date,
  reason: string,
) {
  // Spec: never guess — value literally "not measurable yet"; source explains gap.
  await upsertKpi(personKey, kpiId, date, "not measurable yet", reason);
}

/**
 * Daily live scorecards for Leah / Lemoni / Indigo / Asim.
 * Spec KPI ids (K*, AK*, PK*, UK*, IK*, Fulfilment) — measurable where
 * warehouse sources exist; otherwise "not measurable yet" (never a guess).
 */
export async function computeAndStoreScorecards(now = new Date()) {
  const today = startOfUtcDay(now);
  const dubaiDate = dubaiDateString(now);
  const since24h = new Date(now.getTime() - 24 * 60 * 60_000);
  const since48h = new Date(now.getTime() - 48 * 60 * 60_000);
  const dayStart = today;
  const dayEnd = new Date(today);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    unansweredHighIntent,
    unansweredOver48h,
    financeUploadToday,
    pastDueSubs,
    callsToday,
    pendingReports,
    connectorErrors,
    shippedLast24h,
    lowCoverStock,
    openTodosLeah,
    n8nRuns,
    n8nErrors,
    unsignedAffiliates,
    taggedUploadsStuck,
    ct1Alerts,
  ] = await Promise.all([
    db.leadThread.count({
      where: { highIntent: true, lastReplyAt: null },
    }),
    db.leadThread.count({
      where: {
        highIntent: true,
        lastReplyAt: null,
        lastInboundAt: { lt: since48h },
      },
    }),
    db.financeTxn.count({
      where: {
        date: new Date(dubaiDate),
        uploadBatch: { startsWith: "leah-" },
      },
    }),
    db.subscription.count({ where: { status: "past_due" } }),
    db.call.count({
      where: { scheduledAt: { gte: dayStart, lt: dayEnd } },
    }),
    db.staffReport.count({
      where: { personKey: "lemoni", status: "submitted" },
    }),
    db.connectorRun.count({
      where: {
        status: { not: "phased" },
        OR: [
          { status: "error" },
          {
            lastSuccessAt: {
              lt: new Date(now.getTime() - 6 * 60 * 60_000),
            },
          },
          { lastSuccessAt: null },
        ],
      },
    }),
    db.fulfilment.count({
      where: { fulfilledAt: { gte: since24h } },
    }),
    db.stockItem.count({
      where: { daysOfCover: { not: null, lt: 30 } },
    }),
    db.staffTodo.count({
      where: { personKey: "leah", status: "open" },
    }),
    db.connectorRun.findFirst({
      where: { sourceId: "S6" },
      orderBy: { updatedAt: "desc" },
    }),
    db.alert.count({
      where: {
        ruleId: { in: ["SY2", "SY3", "SY4"] },
        createdAt: { gte: since24h },
      },
    }),
    db.affiliate.count({ where: { agreementSigned: false } }),
    db.contentAsset.count({
      where: {
        state: ContentState.tagged,
        updatedAt: { lt: since24h },
      },
    }),
    db.alert.count({
      where: { ruleId: "CT1", createdAt: { gte: monthStart } },
    }),
  ]);

  // ── Leah (P1) ──────────────────────────────────────────────────
  await upsertKpi(
    "leah",
    "K1 Template on time",
    today,
    financeUploadToday > 0 ? 1 : 0,
    "finance_txn",
  );
  await upsertNotMeasurable(
    "leah",
    "K2 Template accuracy",
    today,
    "needs payout reconcile live",
  );
  await upsertNotMeasurable(
    "leah",
    "K3 Uncategorised spend %",
    today,
    "needs month-to-date OUT categorisation rollup",
  );
  await upsertKpi(
    "leah",
    "K4 Past-due subscriptions",
    today,
    pastDueSubs,
    "subscription",
  );
  await upsertKpi(
    "leah",
    "K5 High-intent unanswered",
    today,
    unansweredHighIntent,
    "lead_thread",
  );
  await upsertKpi(
    "leah",
    "K6 CS backlog proxy (open todos)",
    today,
    openTodosLeah,
    "staff_todo",
  );
  await upsertNotMeasurable(
    "leah",
    "K7 Refund discipline",
    today,
    "needs Shopify+Stripe refund cap join",
  );
  await upsertKpi(
    "leah",
    "K8 Threads waiting 48h+",
    today,
    unansweredOver48h,
    "lead_thread",
  );

  // ── Lemoni (P2) ────────────────────────────────────────────────
  await upsertKpi(
    "lemoni",
    "AK1 Unsigned affiliates",
    today,
    unsignedAffiliates,
    "affiliate",
  );
  await upsertNotMeasurable(
    "lemoni",
    "AK2 Active affiliate rate",
    today,
    "needs last_post_link monthly sweep",
  );
  await upsertNotMeasurable(
    "lemoni",
    "AK3 Referral approval SLA",
    today,
    "UpPromote API not wired",
  );
  await upsertNotMeasurable(
    "lemoni",
    "AK4 Stock variance",
    today,
    "affiliate stock ledger not wired",
  );
  await upsertNotMeasurable(
    "lemoni",
    "AK5 Per-affiliate net contribution",
    today,
    "see affiliate scorecard page — gaps labelled",
  );
  await upsertNotMeasurable(
    "lemoni",
    "AK6 Payback ratio",
    today,
    "see affiliate scorecard page — gaps labelled",
  );
  await upsertKpi(
    "lemoni",
    "UK1 Untagged uploads >24h",
    today,
    taggedUploadsStuck,
    "content_asset",
  );
  await upsertKpi(
    "lemoni",
    "UK2 CT1 alerts this month",
    today,
    ct1Alerts,
    "alert",
  );
  await upsertKpi("lemoni", "PK1 Calls today", today, callsToday, "call");
  await upsertKpi(
    "lemoni",
    "PK2 Pending staff reports",
    today,
    pendingReports,
    "staff_report",
  );
  await upsertNotMeasurable(
    "lemoni",
    "PK3 Show rate",
    today,
    "needs Calendly held vs booked",
  );
  await upsertNotMeasurable(
    "lemoni",
    "PK4 No-show chase SLA",
    today,
    "needs message log timestamps",
  );
  await upsertNotMeasurable(
    "lemoni",
    "PK5 Calendar block conflicts",
    today,
    "needs calendar vs fixed-block join",
  );

  // ── Indigo (P3) ────────────────────────────────────────────────
  const n8nHealthy = n8nRuns?.status === "healthy" ? 1 : 0;
  await upsertKpi(
    "indigo",
    "IK1 n8n connector healthy",
    today,
    n8nHealthy,
    "connector_run:S6",
  );
  await upsertKpi(
    "indigo",
    "IK2 Escalation / n8n alerts 24h",
    today,
    n8nErrors,
    "alert",
  );
  await upsertKpi(
    "indigo",
    "IK3 Connector errors (SY5)",
    today,
    connectorErrors,
    "connector_run",
  );
  await upsertNotMeasurable(
    "indigo",
    "IK4 WA coach responsiveness",
    today,
    "GHL conversation latency — Indigo owns coach; read when GHL_* live",
  );
  await upsertNotMeasurable(
    "indigo",
    "IK5 IG agent conversion",
    today,
    "GHL ladder completion — baseline when GHL_* live",
  );

  // ── Asim (P4) ──────────────────────────────────────────────────
  await upsertKpi(
    "asim",
    "F1 Fulfilments shipped 24h",
    today,
    shippedLast24h,
    "fulfilment",
  );
  await upsertKpi(
    "asim",
    "F2 Stock under 30d cover",
    today,
    lowCoverStock,
    "stock_item",
  );
  await upsertNotMeasurable(
    "asim",
    "F3 Pick accuracy",
    today,
    "needs returns/wrong-item signal",
  );
  await upsertNotMeasurable(
    "asim",
    "F4 Dispatch SLA",
    today,
    "needs order-created → fulfilledAt join",
  );

  return {
    date: today.toISOString().slice(0, 10),
    people: STAFF_PEOPLE.map((p) => p.personKey),
    values: {
      leah: {
        unansweredHighIntent,
        financeUploadToday: financeUploadToday > 0 ? 1 : 0,
        pastDueSubs,
      },
      lemoni: { callsToday, pendingReports, unsignedAffiliates },
      indigo: { connectorErrors, n8nErrors },
      asim: { shippedLast24h, lowCoverStock },
    },
  };
}
