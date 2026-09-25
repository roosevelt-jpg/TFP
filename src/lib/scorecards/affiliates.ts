import "server-only";

import { db } from "@/db";

const NOT_MEASURABLE = "not measurable yet" as const;

export type AffiliateScorecardRow = {
  affiliateId: string;
  name: string;
  email: string | null;
  agreementSigned: boolean;
  lastPostLink: string | null;
  codes: string[];
  /** Orders on AffiliateCode.ordersCount (register-side counter). */
  registerOrders: number;
  /** WarehouseOrder rows whose discountCode matches one of this affiliate's codes. */
  linkedWarehouseOrders: number;
  /** Sum of netPence on linked warehouse orders (partial — not full AK5). */
  linkedNetPence: number;
  /** Sum of discountPence on linked warehouse orders. */
  linkedDiscountPence: number;
  /** Programme purchases whose promoCode matches a code. */
  linkedProgrammePurchases: number;
  ak5: typeof NOT_MEASURABLE;
  ak6: typeof NOT_MEASURABLE;
};

export type AffiliateScorecard = {
  affiliateCount: number;
  codeCount: number;
  codes: string[];
  signedCount: number;
  /** AK1 — % of live codes mapped to a signed named affiliate. */
  registerIntegrityPct: number | typeof NOT_MEASURABLE;
  /** AK2 — % of signed roster with lastPostLink evidence this month. */
  activeRatePct: number | typeof NOT_MEASURABLE;
  linkedWarehouseOrderCount: number;
  warehouseOrdersLinked: boolean;
  ak5: typeof NOT_MEASURABLE;
  ak6: typeof NOT_MEASURABLE;
  attributionGaps: string[];
  rows: AffiliateScorecardRow[];
};

/**
 * Lemoni affiliate scorecard — what Affiliate + AffiliateCode +
 * WarehouseOrder.discountCode (when set) + Purchase.promoCode can support.
 * AK5/AK6 stay "not measurable yet" per Part P2 known attribution gaps.
 */
export async function computeAffiliateScorecard(): Promise<AffiliateScorecard> {
  const affiliates = await db.affiliate.findMany({
    include: { codes: true },
    orderBy: { name: "asc" },
  });

  const allCodes = affiliates.flatMap((a) => a.codes.map((c) => c.code));
  const codeUpper = new Set(allCodes.map((c) => c.toUpperCase()));

  const [warehouseOrders, programmePurchases] = await Promise.all([
    codeUpper.size
      ? db.warehouseOrder.findMany({
          where: { discountCode: { not: null } },
          select: {
            discountCode: true,
            netPence: true,
            discountPence: true,
          },
          take: 10_000,
        })
      : Promise.resolve([]),
    codeUpper.size
      ? db.purchase.findMany({
          where: {
            promoCode: { not: null },
            status: "paid",
          },
          select: { promoCode: true },
          take: 10_000,
        })
      : Promise.resolve([]),
  ]);

  const whLookup = new Map<
    string,
    { count: number; netPence: number; discountPence: number }
  >();
  for (const o of warehouseOrders) {
    const key = o.discountCode?.toUpperCase();
    if (!key || !codeUpper.has(key)) continue;
    const cur = whLookup.get(key) ?? {
      count: 0,
      netPence: 0,
      discountPence: 0,
    };
    cur.count += 1;
    cur.netPence += o.netPence;
    cur.discountPence += o.discountPence;
    whLookup.set(key, cur);
  }

  const purchaseLookup = new Map<string, number>();
  for (const p of programmePurchases) {
    const key = p.promoCode?.toUpperCase();
    if (!key || !codeUpper.has(key)) continue;
    purchaseLookup.set(key, (purchaseLookup.get(key) ?? 0) + 1);
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const rows: AffiliateScorecardRow[] = affiliates.map((a) => {
    const codes = a.codes.map((c) => c.code);
    let linkedWarehouseOrders = 0;
    let linkedNetPence = 0;
    let linkedDiscountPence = 0;
    let linkedProgrammePurchases = 0;
    let registerOrders = 0;
    for (const c of a.codes) {
      registerOrders += c.ordersCount;
      const wh = whLookup.get(c.code.toUpperCase());
      if (wh) {
        linkedWarehouseOrders += wh.count;
        linkedNetPence += wh.netPence;
        linkedDiscountPence += wh.discountPence;
      }
      linkedProgrammePurchases +=
        purchaseLookup.get(c.code.toUpperCase()) ?? 0;
    }
    return {
      affiliateId: a.id,
      name: a.name,
      email: a.email,
      agreementSigned: a.agreementSigned,
      lastPostLink: a.lastPostLink,
      codes,
      registerOrders,
      linkedWarehouseOrders,
      linkedNetPence,
      linkedDiscountPence,
      linkedProgrammePurchases,
      ak5: NOT_MEASURABLE,
      ak6: NOT_MEASURABLE,
    };
  });

  const codeCount = allCodes.length;
  const signedWithCode = affiliates.filter(
    (a) => a.agreementSigned && a.codes.length > 0,
  ).length;
  const codesOnSigned = affiliates
    .filter((a) => a.agreementSigned)
    .reduce((n, a) => n + a.codes.length, 0);
  const registerIntegrityPct =
    codeCount === 0
      ? NOT_MEASURABLE
      : Math.round((codesOnSigned / codeCount) * 100);

  const signedRoster = affiliates.filter((a) => a.agreementSigned);
  const activePosted = signedRoster.filter(
    (a) => a.lastPostLink && a.updatedAt >= monthStart,
  ).length;
  const activeRatePct =
    signedRoster.length === 0
      ? NOT_MEASURABLE
      : Math.round((activePosted / signedRoster.length) * 100);

  const linkedWarehouseOrderCount = [...whLookup.values()].reduce(
    (n, v) => n + v.count,
    0,
  );

  return {
    affiliateCount: affiliates.length,
    codeCount,
    codes: allCodes,
    signedCount: signedWithCode,
    registerIntegrityPct,
    activeRatePct,
    linkedWarehouseOrderCount,
    warehouseOrdersLinked: linkedWarehouseOrderCount > 0,
    ak5: NOT_MEASURABLE,
    ak6: NOT_MEASURABLE,
    attributionGaps: [
      "Paid-ad use of creator assets has no attribution link",
      "Repeat purchases are not attributable per affiliate",
      "Duplicate codes for one person split revenue until merged",
      "Full AK5 needs commission + gifted stock + postage ledger (not wired)",
    ],
    rows,
  };
}
