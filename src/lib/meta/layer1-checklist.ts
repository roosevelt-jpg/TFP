import "server-only";

import { db } from "@/db";
import { calculateBreakEvenAmer } from "@/lib/metrics/economics";

export type Layer1Criterion = {
  id: string;
  label: string;
  met: boolean;
  detail: string;
};

/**
 * Nathan Layer 1 exit criteria (Part 05) — live tiles from warehouse.
 * Missing sources show unmet with an honest detail, never a guess.
 */
export async function getNathanLayer1Checklist(): Promise<{
  metCount: number;
  total: number;
  criteria: Layer1Criterion[];
  ladderNote: string;
}> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);
  since.setUTCHours(0, 0, 0, 0);

  const [adRows, economics, changeEvents, gateSnap] = await Promise.all([
    db.adDaily.findMany({
      where: { date: { gte: since } },
      orderBy: { date: "desc" },
    }),
    calculateBreakEvenAmer(),
    db.changeEvent.count({
      where: {
        occurredAt: { gte: since },
        changeType: { not: "observed" },
      },
    }),
    db.dailySnapshot.findFirst({
      orderBy: { date: "desc" },
      select: { revenuePence: true, adSpendPence: true, amer: true },
    }),
  ]);

  const spendPence = adRows.reduce((s, r) => s + r.spendPence, 0);
  const purchasesIncr = adRows.reduce((s, r) => s + r.purchasesIncr, 0);
  const valueIncr = adRows.reduce((s, r) => s + r.purchaseValueIncrPence, 0);
  const value7d = adRows.reduce((s, r) => s + r.purchaseValue7dPence, 0);
  const incrRoas = spendPence > 0 ? valueIncr / spendPence : 0;
  const clickRoas = spendPence > 0 ? value7d / spendPence : 0;

  const byAdSet = new Map<
    string,
    { spend: number; incrPurchases: number; days: Set<string> }
  >();
  for (const row of adRows) {
    const cur = byAdSet.get(row.adSetId) ?? {
      spend: 0,
      incrPurchases: 0,
      days: new Set<string>(),
    };
    cur.spend += row.spendPence;
    cur.incrPurchases += row.purchasesIncr;
    cur.days.add(row.date.toISOString().slice(0, 10));
    byAdSet.set(row.adSetId, cur);
  }

  const stableAdSets = [...byAdSet.values()].filter(
    (a) => a.days.size >= 7 && a.incrPurchases >= 1,
  ).length;

  const criteria: Layer1Criterion[] = [
    {
      id: "L1-SPEND",
      label: "Meaningful cold spend in window",
      met: spendPence >= 300_000,
      detail:
        spendPence > 0
          ? `£${(spendPence / 100).toFixed(0)} Meta spend (14d verified)`
          : "not measurable yet — Meta pull empty",
    },
    {
      id: "L1-INCR-PURCHASES",
      label: "≥10 incremental purchases in window",
      met: purchasesIncr >= 10,
      detail:
        purchasesIncr > 0
          ? `${purchasesIncr} incremental purchases (14d)`
          : "not measurable yet — no incremental purchases",
    },
    {
      id: "L1-INCR-ROAS",
      label: "Incremental ROAS above break-even",
      met: incrRoas >= economics.breakEvenAmer && spendPence > 0,
      detail:
        spendPence > 0
          ? `Incr ${incrRoas.toFixed(2)}x vs break-even ${economics.breakEvenAmer.toFixed(2)}x (7d click ${clickRoas.toFixed(2)}x)`
          : "not measurable yet",
    },
    {
      id: "L1-STABLE-SETS",
      label: "Stable ad sets with clean days",
      met: stableAdSets >= 1,
      detail:
        byAdSet.size > 0
          ? `${stableAdSets} of ${byAdSet.size} ad sets with ≥7 days + incr purchases`
          : "not measurable yet",
    },
    {
      id: "L1-CHANGE-LOG",
      label: "Change events recorded for overlays",
      met: changeEvents > 0,
      detail:
        changeEvents > 0
          ? `${changeEvents} change events in 14d`
          : "No change events yet — averages not split",
    },
    {
      id: "L1-AMER",
      label: "Account aMER tracked",
      met: Boolean(gateSnap?.amer && gateSnap.amer > 0),
      detail: gateSnap?.amer
        ? `Latest snapshot aMER ${gateSnap.amer.toFixed(2)}x`
        : "not measurable yet — no daily snapshot",
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  return {
    metCount,
    total: criteria.length,
    criteria,
    ladderNote:
      metCount >= criteria.length
        ? "Layer 1 exit criteria met — ready to discuss Layer 2 with Kane."
        : `Layer 1: ${metCount} of ${criteria.length} met. Stay on proof of the cold hook.`,
  };
}
