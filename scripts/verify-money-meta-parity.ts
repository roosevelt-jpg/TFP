/**
 * Phase 1 live parity harness — warehouse Shopify net vs optional Analytics hint,
 * AdDaily spend by ad set (compare Ads Manager by eye), offline PASS/FAIL checklist.
 *
 * Always exits 0. Prints PASS/FAIL lines for items computable offline.
 *
 * Usage:
 *   pnpm tsx scripts/verify-money-meta-parity.ts
 *   SHOPIFY_ANALYTICS_HINT=1234.56 pnpm tsx scripts/verify-money-meta-parity.ts
 *
 * SHOPIFY_ANALYTICS_HINT = yesterday's Shopify Analytics net revenue in GBP pounds
 * (optional). When set, checklist compares warehouse sum within £1.
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set (.env.local or .env)");
  process.exit(0);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const db = new PrismaClient({ adapter });

function startOfUtcYesterday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function gbp(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function line(ok: boolean, id: string, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  — ${detail}`);
}

async function breakEvenInputs() {
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
    (
      await db.adDaily.aggregate({
        where: { date: { gte: weekAgo } },
        _sum: { spendPence: true },
      })
    )._sum.spendPence ?? 0;

  const newCustomers = orders._count;
  const net = orders._sum.netPence ?? 0;
  const cogs = orders._sum.cogsPence ?? 0;
  const shipping = orders._sum.shippingPence ?? 0;
  const feePence = Math.round(net * 0.015) + newCustomers * 20;
  const contributionBeforeAds = net - cogs - shipping - feePence;
  const contributionPerNew =
    newCustomers > 0 ? contributionBeforeAds / newCustomers : 0;
  const avgNewOrderValue = newCustomers > 0 ? net / newCustomers : 0;
  const breakEvenAmer =
    contributionPerNew > 0 ? avgNewOrderValue / contributionPerNew : 0;

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
  };
}

async function main() {
  const yesterday = startOfUtcYesterday();
  const tomorrow = new Date(yesterday);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayLabel = yesterday.toISOString().slice(0, 10);

  console.log(`\n=== Money / Meta parity · ${dayLabel} (UTC) ===\n`);

  const shopAgg = await db.warehouseOrder.aggregate({
    where: {
      businessLine: "supplements",
      paidAt: { gte: yesterday, lt: tomorrow },
    },
    _sum: { netPence: true },
    _count: true,
  });
  const warehouseNet = shopAgg._sum.netPence ?? 0;
  console.log(
    `Shopify warehouse net (yesterday): ${gbp(warehouseNet)} · ${shopAgg._count} orders`,
  );

  const hintRaw = process.env.SHOPIFY_ANALYTICS_HINT?.trim();
  let hintPence: number | null = null;
  if (hintRaw) {
    const n = Number(hintRaw);
    if (Number.isFinite(n)) {
      // Treat values ≥ 10_000 as already pence; otherwise GBP pounds.
      hintPence = n >= 10_000 ? Math.round(n) : Math.round(n * 100);
      const delta = Math.abs(warehouseNet - hintPence);
      console.log(
        `SHOPIFY_ANALYTICS_HINT: ${gbp(hintPence)} · Δ ${gbp(delta)} (need ≤ £1)`,
      );
    } else {
      console.log(`SHOPIFY_ANALYTICS_HINT set but not numeric: ${hintRaw}`);
    }
  } else {
    console.log(
      "SHOPIFY_ANALYTICS_HINT unset — compare warehouse total to Shopify Analytics manually.",
    );
  }

  const adRows = await db.adDaily.findMany({
    where: { date: yesterday },
    orderBy: { adSetName: "asc" },
  });
  const spendBySet = new Map<
    string,
    { name: string; spendPence: number }
  >();
  for (const row of adRows) {
    const cur = spendBySet.get(row.adSetId) ?? {
      name: row.adSetName,
      spendPence: 0,
    };
    cur.spendPence += row.spendPence;
    spendBySet.set(row.adSetId, cur);
  }
  const totalSpend = [...spendBySet.values()].reduce(
    (s, r) => s + r.spendPence,
    0,
  );

  console.log(`\nMeta AdDaily spend by ad set (${dayLabel}):`);
  if (spendBySet.size === 0) {
    console.log("  (no AdDaily rows for yesterday)");
  } else {
    for (const [id, v] of spendBySet) {
      console.log(`  ${v.name} (${id}): ${gbp(v.spendPence)}`);
    }
    console.log(`  TOTAL: ${gbp(totalSpend)}`);
  }
  console.log(
    "  → Compare each ad set + total to Ads Manager for the same UTC day (within £1).",
  );

  const economics = await breakEvenInputs();
  console.log("\nBreak-even inputs (7d new-customer supplements):");
  for (const [k, v] of Object.entries(economics.inputs)) {
    console.log(
      `  ${k}: ${typeof v === "number" && k.endsWith("Pence") ? gbp(v) : v}`,
    );
  }
  console.log(`  breakEvenAmer: ${economics.breakEvenAmer.toFixed(3)}x`);

  console.log("\n=== Phase 1 offline checklist ===\n");

  const dualSample = await db.adDaily.findFirst({
    where: {
      OR: [
        { purchaseValue7dPence: { gt: 0 } },
        { purchaseValueIncrPence: { gt: 0 } },
        { spendPence: { gt: 0 } },
      ],
    },
    orderBy: { date: "desc" },
    select: {
      date: true,
      adSetId: true,
      purchaseValue7dPence: true,
      purchaseValueIncrPence: true,
      purchases7d: true,
      purchasesIncr: true,
    },
  });
  const dualColumnsPresent =
    dualSample != null &&
    typeof dualSample.purchaseValue7dPence === "number" &&
    typeof dualSample.purchaseValueIncrPence === "number";
  line(
    dualColumnsPresent,
    "P1-DUAL-ATTR",
    dualColumnsPresent
      ? `AdDaily has 7d + incr columns (sample ${dualSample.date.toISOString().slice(0, 10)} · 7d ${gbp(dualSample.purchaseValue7dPence)} / incr ${gbp(dualSample.purchaseValueIncrPence)})`
      : "No AdDaily rows yet — dual attribution columns not observable",
  );

  const inputKeys = [
    "netPence",
    "cogsPence",
    "shippingPence",
    "feePence",
    "adSpendPence",
    "newCustomers",
    "avgNewOrderValuePence",
    "contributionPerNewPence",
  ] as const;
  const inputsVisible = inputKeys.every(
    (k) => economics.inputs[k] !== undefined && economics.inputs[k] !== null,
  );
  line(
    inputsVisible,
    "P1-BREAKEVEN-INPUTS",
    inputsVisible
      ? `Break-even inputs visible · BE aMER ${economics.breakEvenAmer.toFixed(2)}x`
      : "Break-even inputs incomplete",
  );

  if (hintPence != null) {
    const withinOne = Math.abs(warehouseNet - hintPence) <= 100;
    line(
      withinOne,
      "P1-SHOPIFY-£1",
      withinOne
        ? `Warehouse ${gbp(warehouseNet)} matches hint within £1`
        : `Warehouse ${gbp(warehouseNet)} vs hint ${gbp(hintPence)} — outside £1`,
    );
  } else {
    line(
      false,
      "P1-SHOPIFY-£1",
      "Skipped offline — set SHOPIFY_ANALYTICS_HINT (GBP) to auto-check",
    );
  }

  line(
    spendBySet.size > 0,
    "P1-META-SPEND-ROWS",
    spendBySet.size > 0
      ? `${spendBySet.size} ad sets · ${gbp(totalSpend)} — verify vs Ads Manager manually`
      : "No yesterday AdDaily spend — pull Meta or check credentials",
  );

  console.log(
    "\n(Harness always exits 0 — FAIL lines are checklist status, not process failure.)\n",
  );
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
