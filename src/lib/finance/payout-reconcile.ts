import "server-only";

import { matchLiveStripePayout } from "@/lib/finance/stripe-payouts";
import { db } from "@/db";

const TOLERANCE_PENCE = 100; // ±£1
const WINDOW_DAYS = 2;

export type PayoutReconcileResult = {
  matched: boolean;
  source?: "stripe" | "stripe_live" | "shopify" | "tiktok" | "none";
  platformTotalPence?: number;
  deltaPence?: number;
  note: string;
};

function windowAround(date: Date) {
  const from = new Date(date);
  from.setUTCDate(from.getUTCDate() - WINDOW_DAYS);
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(date);
  to.setUTCDate(to.getUTCDate() + WINDOW_DAYS + 1);
  to.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

/**
 * When a FinanceTxn is a payout IN, try match to Stripe/Shopify warehouse
 * totals within ±£1 and ±2 days. For PAYOUT_STRIPE, prefer live Stripe
 * payouts API when STRIPE_SECRET_KEY is present. Writes an audit note either way.
 */
export async function reconcilePayoutTxn(
  financeTxnId: string,
): Promise<PayoutReconcileResult> {
  const txn = await db.financeTxn.findUniqueOrThrow({
    where: { id: financeTxnId },
  });

  const category = txn.category.toUpperCase();
  if (
    !category.startsWith("PAYOUT_") ||
    (txn.subcategory && txn.subcategory !== "IN" && txn.amountPence <= 0)
  ) {
    if (txn.amountPence <= 0 && !category.startsWith("PAYOUT_")) {
      return { matched: false, note: "Not a payout IN row" };
    }
  }

  if (txn.amountPence <= 0) {
    return { matched: false, note: "Payout amount must be positive IN" };
  }

  const { from, to } = windowAround(txn.date);
  let platformTotalPence = 0;
  let source: PayoutReconcileResult["source"] = "none";

  if (category === "PAYOUT_STRIPE") {
    const live = await matchLiveStripePayout({
      amountPence: txn.amountPence,
      date: txn.date,
      currency: txn.currency,
    });

    if (live.attempted) {
      source = "stripe_live";
      if (live.matched && live.payout) {
        platformTotalPence = live.payout.amount;
        const deltaPence = live.deltaPence ?? 0;
        const note = `Payout matched stripe live payout ${live.payout.id} ±£1 within ±${WINDOW_DAYS}d (txn ${txn.amountPence}p vs payout ${platformTotalPence}p, Δ${deltaPence}p)`;
        await db.auditLog.create({
          data: {
            actor: "finance.payout-reconcile",
            action: "finance.payout.matched",
            entityType: "FinanceTxn",
            entityId: txn.id,
            meta: {
              category,
              amountPence: txn.amountPence,
              platformTotalPence,
              deltaPence,
              source,
              matched: true,
              stripePayoutId: live.payout.id,
              windowFrom: from.toISOString(),
              windowTo: to.toISOString(),
              note,
            },
          },
        });
        return {
          matched: true,
          source,
          platformTotalPence,
          deltaPence,
          note,
        };
      }
      // Live key present but no payout match — fall through to warehouse.
    }

    source = "stripe";
    const purchases = await db.purchase.aggregate({
      where: {
        status: "paid",
        purchasedAt: { gte: from, lt: to },
        currency: { equals: txn.currency, mode: "insensitive" },
      },
      _sum: { amountTotal: true },
    });
    const warehouse = await db.warehousePayment.aggregate({
      where: {
        stripeChargeId: { not: null },
        paidAt: { gte: from, lt: to },
        currency: { equals: txn.currency, mode: "insensitive" },
      },
      _sum: { amountPence: true },
    });
    // Prefer warehouse mirror when populated; else training Purchase totals.
    platformTotalPence =
      (warehouse._sum.amountPence ?? 0) > 0
        ? (warehouse._sum.amountPence ?? 0)
        : (purchases._sum.amountTotal ?? 0);
  } else if (category === "PAYOUT_SHOPIFY") {
    source = "shopify";
    const orders = await db.warehouseOrder.aggregate({
      where: {
        businessLine: "supplements",
        paidAt: { gte: from, lt: to },
        currency: { equals: txn.currency, mode: "insensitive" },
      },
      _sum: { netPence: true },
    });
    platformTotalPence = orders._sum.netPence ?? 0;
  } else if (category === "PAYOUT_TIKTOK") {
    source = "tiktok";
    // No live TikTok Shop connector yet — leave unmatched with an audit note.
    platformTotalPence = 0;
  }

  const deltaPence = Math.abs(txn.amountPence - platformTotalPence);
  const matched =
    source !== "tiktok" &&
    source !== "none" &&
    platformTotalPence > 0 &&
    deltaPence <= TOLERANCE_PENCE;

  const note = matched
    ? `Payout matched ${source} totals ±£1 within ±${WINDOW_DAYS}d (txn ${txn.amountPence}p vs platform ${platformTotalPence}p, Δ${deltaPence}p)`
    : `Payout unmatched vs ${source}: txn ${txn.amountPence}p, platform ${platformTotalPence}p, Δ${deltaPence}p (±£1 / ±${WINDOW_DAYS}d)`;

  await db.auditLog.create({
    data: {
      actor: "finance.payout-reconcile",
      action: matched ? "finance.payout.matched" : "finance.payout.unmatched",
      entityType: "FinanceTxn",
      entityId: txn.id,
      meta: {
        category,
        amountPence: txn.amountPence,
        platformTotalPence,
        deltaPence,
        source,
        matched,
        windowFrom: from.toISOString(),
        windowTo: to.toISOString(),
        note,
      },
    },
  });

  return {
    matched,
    source,
    platformTotalPence,
    deltaPence,
    note,
  };
}
