import "server-only";

import { db } from "@/db";

/** Break-even aMER from live COGS / fees / fulfilment — never hardcoded. */
export async function calculateBreakEvenAmer(opts?: {
  adSpendPence?: number;
  newCustomers?: number;
}) {
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const orders = await db.warehouseOrder.aggregate({
    where: {
      businessLine: "supplements",
      paidAt: { gte: weekAgo },
      isNewCustomer: true,
    },
    _sum: {
      netPence: true,
      cogsPence: true,
      shippingPence: true,
    },
    _count: true,
  });

  const adSpend =
    opts?.adSpendPence ??
    (
      await db.adDaily.aggregate({
        where: { date: { gte: weekAgo } },
        _sum: { spendPence: true },
      })
    )._sum.spendPence ??
    0;

  const newCustomers = opts?.newCustomers ?? orders._count;
  const net = orders._sum.netPence ?? 0;
  const cogs = orders._sum.cogsPence ?? 0;
  const shipping = orders._sum.shippingPence ?? 0;
  // Payment fees approx 1.5% + 20p — shown as an input, not hidden.
  const feePence = Math.round(net * 0.015) + newCustomers * 20;
  const contributionBeforeAds = net - cogs - shipping - feePence;
  const contributionPerNew =
    newCustomers > 0 ? contributionBeforeAds / newCustomers : 0;

  // Break-even aMER = ad spend needed per £1 new-customer contribution inverse:
  // required ROAS where contribution covers ad spend → spend / contributionPerNew
  // displayed as break-even aMER threshold (new revenue / spend).
  const avgNewOrderValue = newCustomers > 0 ? net / newCustomers : 0;
  const breakEvenAmer =
    contributionPerNew > 0 ? avgNewOrderValue / contributionPerNew : 0;

  const blendedCac = newCustomers > 0 ? adSpend / newCustomers : 0;
  const totalNewRevenue = net;
  const amer = adSpend > 0 ? totalNewRevenue / adSpend : 0;

  return {
    inputs: {
      netPence: net,
      cogsPence: cogs,
      shippingPence: shipping,
      feePence,
      adSpendPence: adSpend,
      newCustomers,
      avgNewOrderValuePence: Math.round(avgNewOrderValue),
      contributionPerNewPence: Math.round(contributionPerNew),
    },
    breakEvenAmer,
    blendedCacPence: Math.round(blendedCac),
    amer,
  };
}

export async function rebuildDailySnapshot(date = startOfUtcYesterday()) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);

  const orders = await db.warehouseOrder.aggregate({
    where: { paidAt: { gte: date, lt: next } },
    _sum: { netPence: true, cogsPence: true, shippingPence: true },
  });
  const adSpend = await db.adDaily.aggregate({
    where: { date },
    _sum: { spendPence: true },
  });
  const newOrders = await db.warehouseOrder.count({
    where: {
      paidAt: { gte: date, lt: next },
      isNewCustomer: true,
    },
  });

  const revenue = orders._sum.netPence ?? 0;
  const spend = adSpend._sum.spendPence ?? 0;
  const contribution =
    revenue -
    (orders._sum.cogsPence ?? 0) -
    (orders._sum.shippingPence ?? 0) -
    spend;
  const amer = spend > 0 ? revenue / spend : 0;

  const cash = await db.cashBalance.findMany({
    where: { currency: "gbp" },
  });
  const cashBalancePence = cash.reduce((s, c) => s + c.balanceMinor, 0);

  await db.dailySnapshot.upsert({
    where: { date },
    create: {
      date,
      revenuePence: revenue,
      adSpendPence: spend,
      contributionPence: contribution,
      cashBalancePence,
      amer,
      newLeads: newOrders,
      label: "calculated",
      payload: { rebuiltAt: new Date().toISOString() },
    },
    update: {
      revenuePence: revenue,
      adSpendPence: spend,
      contributionPence: contribution,
      cashBalancePence,
      amer,
      newLeads: newOrders,
      label: "calculated",
      payload: { rebuiltAt: new Date().toISOString() },
    },
  });

  return { date, revenue, spend, amer, contribution };
}

/** £1,000/day gate from Nathan Meta strategy. */
export async function getThousandDayGate() {
  const today = startOfUtcToday();
  const ads = await db.adDaily.aggregate({
    where: { date: today },
    _sum: {
      spendPence: true,
      purchaseValue7dPence: true,
    },
  });
  const spend = ads._sum.spendPence ?? 0;
  const value = ads._sum.purchaseValue7dPence ?? 0;
  const targetPence = 100_000; // £1,000
  return {
    spendPence: spend,
    purchaseValuePence: value,
    targetPence,
    hit: value >= targetPence,
    progress: Math.min(100, Math.round((value / targetPence) * 100)),
  };
}

function startOfUtcToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfUtcYesterday() {
  const d = startOfUtcToday();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
