import "server-only";

import { db } from "@/db";
import { STAFF_PEOPLE, type PersonKey } from "@/lib/admin/staff";

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

/**
 * Daily live scorecards for Leah / Lemoni / Indigo / Asim.
 * Writes KpiValue rows for the UTC day (team pages filter by startOfUtcDay).
 */
export async function computeAndStoreScorecards(now = new Date()) {
  const today = startOfUtcDay(now);
  const dubaiDate = dubaiDateString(now);
  const since24h = new Date(now.getTime() - 24 * 60 * 60_000);
  const dayStart = today;
  const dayEnd = new Date(today);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [
    unansweredHighIntent,
    financeUploadToday,
    pastDueSubs,
    callsToday,
    pendingReports,
    connectorErrors,
    shippedLast24h,
    lowCoverStock,
  ] = await Promise.all([
    db.leadThread.count({
      where: {
        highIntent: true,
        lastReplyAt: null,
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
  ]);

  await upsertKpi(
    "leah",
    "Open high-intent unanswered",
    today,
    unansweredHighIntent,
    "lead_thread",
  );
  await upsertKpi(
    "leah",
    "Finance upload today",
    today,
    financeUploadToday > 0 ? 1 : 0,
    "finance_txn",
  );
  await upsertKpi(
    "leah",
    "Past-due subscriptions",
    today,
    pastDueSubs,
    "subscription",
  );

  await upsertKpi("lemoni", "Calls today", today, callsToday, "call");
  await upsertKpi(
    "lemoni",
    "Pending staff reports",
    today,
    pendingReports,
    "staff_report",
  );

  await upsertKpi(
    "indigo",
    "Connector errors (SY5)",
    today,
    connectorErrors,
    "connector_run",
  );

  await upsertKpi(
    "asim",
    "Fulfilments shipped 24h",
    today,
    shippedLast24h,
    "fulfilment",
  );
  await upsertKpi(
    "asim",
    "Stock under 30d cover",
    today,
    lowCoverStock,
    "stock_item",
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
      lemoni: { callsToday, pendingReports },
      indigo: { connectorErrors },
      asim: { shippedLast24h, lowCoverStock },
    },
  };
}
