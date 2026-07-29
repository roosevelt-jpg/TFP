import { parseArgs } from "node:util";

import { config as loadEnv } from "dotenv";
import Stripe from "stripe";

import {
  LOOKUP_KEYS,
  MEMBERSHIP_AMOUNT_PENCE,
  PROGRAMME_AMOUNT_PENCE,
  STRIPE_CURRENCY,
} from "../src/lib/payments/prices";
import {
  LAUNCH_PROMOTION_CODE,
  LAUNCH_PROMOTION_LIMIT,
} from "../src/lib/pricing";

// Creates the £149 programme, the £79/mo membership, and the Customer Portal
// config. Idempotent: resolves each Price by lookup_key first, so re-running
// verifies rather than duplicates. Amounts come from pricing.ts so advertised
// and charged figures can't drift.
//
// PRO/ELITE are deliberately absent — the client sells those via his own payment
// links and this app never references them.
//
// Run from a developer machine, never Vercel and never a Trigger task: it's a
// one-time-per-mode setup step, and deployed code that can mutate the live price
// catalog is an incident waiting to happen. The app only ever READS the catalog.
//
// Usage:
//   pnpm stripe:bootstrap                          # dry run against .env.local
//   pnpm stripe:bootstrap --execute                # create/repair
//
// Go-live (supervised, deliberate — read the dry run before approving):
//   STRIPE_SECRET_KEY=rk_live_… pnpm stripe:bootstrap --live
//   STRIPE_SECRET_KEY=rk_live_… pnpm stripe:bootstrap --live --execute

const USAGE = "Usage: pnpm stripe:bootstrap [--execute] [--live]";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

loadEnv({ path: [".env.local", ".env"], quiet: true });

const { values } = parseArgs({
  options: {
    execute: { type: "boolean", default: false },
    live: { type: "boolean", default: false },
  },
});

const execute = values.execute === true;
const allowLive = values.live === true;

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) fail(`STRIPE_SECRET_KEY is not set.\n${USAGE}`);

// Explicit opt-in, so live mode can't happen just because the ambient env
// pointed there.
const isLiveKey = secretKey.includes("_live_");
if (isLiveKey && !allowLive) {
  fail(
    `Refusing to use a LIVE key without --live.\nBootstrapping live mode is a supervised go-live step: run the dry run, read it, then re-run with --live --execute.\n${USAGE}`,
  );
}
if (allowLive && !isLiveKey) {
  fail("--live was passed but STRIPE_SECRET_KEY is not a live-mode key.");
}

const stripe = new Stripe(secretKey, {
  apiVersion: Stripe.API_VERSION,
  maxNetworkRetries: 3,
});

type PlannedPrice = {
  lookupKey: string;
  productName: string;
  productDescription: string;
  unitAmount: number;
  recurring?: { interval: "month" };
};

const PLAN: PlannedPrice[] = [
  {
    lookupKey: LOOKUP_KEYS.programme,
    productName: "The Formula Programme (8 weeks)",
    productDescription:
      "Kane's hybrid training system, Block 1. AI accountability agent, WhatsApp community, goal-matched nutrition framework.",
    unitAmount: PROGRAMME_AMOUNT_PENCE,
  },
  {
    lookupKey: LOOKUP_KEYS.membership,
    productName: "The Formula Membership",
    productDescription:
      "Ongoing membership after the 8-week programme: AI agent, community, leaderboards and nutrition framework. Cancel anytime.",
    unitAmount: MEMBERSHIP_AMOUNT_PENCE,
    recurring: { interval: "month" },
  },
];

// Immutable after creation. "inclusive" keeps the advertised £149/£79 as the
// customer-facing total if Stripe Tax is switched on later, instead of adding
// VAT on top or forcing a price migration.
const TAX_BEHAVIOR = "inclusive" as const;

// The coupon the client's promotion codes hang off. Fixed id so re-runs find it
// and the same string works in test and live.
const PROGRAMME_COUPON_ID = "formula_programme_50";

async function findPrice(lookupKey: string) {
  const { data } = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    expand: ["data.product"],
    limit: 1,
  });
  return data[0];
}

async function ensurePrice(planned: PlannedPrice) {
  const existing = await findPrice(planned.lookupKey);

  if (existing) {
    const amountMatches = existing.unit_amount === planned.unitAmount;
    const currencyMatches = existing.currency === STRIPE_CURRENCY;
    const intervalMatches =
      (existing.recurring?.interval ?? null) ===
      (planned.recurring?.interval ?? null);

    if (amountMatches && currencyMatches && intervalMatches) {
      console.log(
        `  ✓ ${planned.lookupKey} — already correct (${existing.id})`,
      );
      return;
    }

    console.log(
      `  ! ${planned.lookupKey} — exists but differs (${existing.id}): ` +
        `amount ${existing.unit_amount} vs ${planned.unitAmount}, ` +
        `currency ${existing.currency} vs ${STRIPE_CURRENCY}, ` +
        `interval ${existing.recurring?.interval ?? "one-time"} vs ${planned.recurring?.interval ?? "one-time"}`,
    );

    if (!execute) {
      console.log("    would deactivate it and create a replacement Price");
      return;
    }

    // Prices are immutable, so changing one means retiring it and creating a
    // successor. The lookup_key must be freed first — it can only point at one
    // active Price.
    await stripe.prices.update(existing.id, {
      active: false,
      lookup_key: `${planned.lookupKey}_retired_${existing.id}`,
    });
    console.log(`    deactivated ${existing.id}`);

    const productId =
      typeof existing.product === "string"
        ? existing.product
        : existing.product.id;
    const replacement = await stripe.prices.create({
      product: productId,
      currency: STRIPE_CURRENCY,
      unit_amount: planned.unitAmount,
      lookup_key: planned.lookupKey,
      tax_behavior: TAX_BEHAVIOR,
      ...(planned.recurring ? { recurring: planned.recurring } : {}),
    });
    console.log(`    created ${replacement.id}`);
    return;
  }

  if (!execute) {
    console.log(
      `  + ${planned.lookupKey} — would create "${planned.productName}" ` +
        `at ${planned.unitAmount} ${STRIPE_CURRENCY}` +
        `${planned.recurring ? `/${planned.recurring.interval}` : " one-time"}`,
    );
    return;
  }

  // One Product per plan: line items render the Product name, so sharing one
  // would make the two indistinguishable at checkout.
  const product = await stripe.products.create({
    name: planned.productName,
    description: planned.productDescription,
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: STRIPE_CURRENCY,
    unit_amount: planned.unitAmount,
    lookup_key: planned.lookupKey,
    tax_behavior: TAX_BEHAVIOR,
    ...(planned.recurring ? { recurring: planned.recurring } : {}),
  });

  console.log(
    `  + ${planned.lookupKey} — created product ${product.id} + price ${price.id}`,
  );
}

// 50% off the £149 only. Two independent guards, because the £149 and the £79
// land on DIFFERENT invoices (the membership is deferred by the trial), which
// makes "first charge" ambiguous on its own:
//   applies_to  — scopes the discount to the programme product
//   duration    — scopes it to a single charge
// Without applies_to, this same coupon would take 50% off the monthly
// membership too, and nobody would notice until the revenue was wrong.
async function ensureProgrammeCoupon() {
  // applies_to isn't returned unless expanded, so without this the check reads
  // a correctly-scoped coupon as unscoped and reports it broken on every re-run.
  const existing = await stripe.coupons
    .retrieve(PROGRAMME_COUPON_ID, { expand: ["applies_to"] })
    .catch(() => null);

  const programmePrice = await findPrice(LOOKUP_KEYS.programme);
  if (!programmePrice) {
    console.log("  ! skipped — programme price must exist first");
    return;
  }

  const productId =
    typeof programmePrice.product === "string"
      ? programmePrice.product
      : programmePrice.product.id;

  if (existing) {
    const scopedToProgramme =
      existing.applies_to?.products?.length === 1 &&
      existing.applies_to.products[0] === productId;

    if (
      existing.percent_off === 50 &&
      existing.duration === "once" &&
      scopedToProgramme
    ) {
      console.log(`  ✓ ${PROGRAMME_COUPON_ID} — already correct`);
      return;
    }

    // Coupons are immutable apart from name/metadata, so a wrong one has to be
    // deleted rather than corrected. Refuse to do that automatically: any
    // promotion codes the client built on top of it would die with it.
    console.log(
      `  ! ${PROGRAMME_COUPON_ID} — exists but is WRONG ` +
        `(percent_off=${existing.percent_off}, duration=${existing.duration}, ` +
        `scoped=${scopedToProgramme}). Delete it in the Dashboard and re-run — ` +
        "this will also invalidate any promotion codes attached to it.",
    );
    return;
  }

  if (!execute) {
    console.log(
      `  + ${PROGRAMME_COUPON_ID} — would create 50% off, once, scoped to ${productId}`,
    );
    return;
  }

  const coupon = await stripe.coupons.create({
    id: PROGRAMME_COUPON_ID,
    percent_off: 50,
    duration: "once",
    applies_to: { products: [productId] },
    name: "50% off the programme",
  });

  console.log(`  + ${coupon.id} — created (50% off ${productId} only)`);
}

// The customer-facing code on top of that coupon. Capped at 50 redemptions:
// Stripe stops accepting it at the limit, so the cap is enforced at checkout
// rather than by anyone counting.
async function ensureLaunchPromotionCode() {
  const { data } = await stripe.promotionCodes.list({
    code: LAUNCH_PROMOTION_CODE,
    limit: 1,
  });
  const [existing] = data;

  if (existing) {
    const couponId =
      typeof existing.promotion === "string"
        ? existing.promotion
        : existing.promotion?.coupon;

    const correct =
      couponId === PROGRAMME_COUPON_ID &&
      existing.max_redemptions === LAUNCH_PROMOTION_LIMIT;

    console.log(
      correct
        ? `  ✓ ${LAUNCH_PROMOTION_CODE} — already correct (${existing.times_redeemed}/${LAUNCH_PROMOTION_LIMIT} used)`
        : `  ! ${LAUNCH_PROMOTION_CODE} — exists but is WRONG ` +
            `(coupon=${couponId}, max=${existing.max_redemptions}). ` +
            "Deactivate it in the Dashboard and re-run.",
    );
    return;
  }

  const coupon = await stripe.coupons
    .retrieve(PROGRAMME_COUPON_ID)
    .catch(() => null);
  if (!coupon) {
    console.log("  ! skipped — the programme coupon must exist first");
    return;
  }

  if (!execute) {
    console.log(
      `  + ${LAUNCH_PROMOTION_CODE} — would create, 50% off the programme, max ${LAUNCH_PROMOTION_LIMIT} redemptions`,
    );
    return;
  }

  const promotionCode = await stripe.promotionCodes.create({
    code: LAUNCH_PROMOTION_CODE,
    promotion: { type: "coupon", coupon: PROGRAMME_COUPON_ID },
    max_redemptions: LAUNCH_PROMOTION_LIMIT,
  });

  console.log(
    `  + ${promotionCode.code} — created (max ${LAUNCH_PROMOTION_LIMIT} redemptions)`,
  );
}

// The "cancel anytime, no retention hoops" promise in code.
async function ensurePortalConfiguration() {
  const { data } = await stripe.billingPortal.configurations.list({
    limit: 10,
  });
  const ours = data.find(
    (config) => config.metadata?.managed_by === "the-formula-programme",
  );

  if (ours) {
    // The login page is what makes a portal link safe to put in an email:
    // portal sessions expire, this URL does not.
    if (!ours.login_page.enabled) {
      if (!execute) {
        console.log(`  + ${ours.id} — would enable the portal login page`);
        return;
      }
      const updated = await stripe.billingPortal.configurations.update(
        ours.id,
        {
          login_page: { enabled: true },
        },
      );
      console.log(
        `  + ${ours.id} — login page enabled (${updated.login_page.url})`,
      );
      return;
    }

    console.log(
      `  ✓ portal configuration — already correct (${ours.id}, login ${ours.login_page.url})`,
    );
    return;
  }

  if (!execute) {
    console.log("  + portal configuration — would create");
    return;
  }

  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your Formula membership",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "phone", "tax_id"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        // No survey, no pause: the site promises no retention hoops.
        proration_behavior: "none",
      },
    },
    // Permanent, email-safe entry point: customers authenticate with their
    // address and a one-time passcode rather than a link that expires.
    login_page: { enabled: true },
    metadata: { managed_by: "the-formula-programme" },
  });

  console.log(`  + portal configuration — created ${config.id}`);
}

async function main() {
  // Names the account before it writes anything, so a key pointed at the wrong
  // one is obvious. Reading it needs a permission unrelated to everything else
  // this script does, so a key without it still runs — losing the banner is
  // worse than nothing, but not worth blocking a go-live over.
  const account = await stripe.accounts.retrieve(null).catch(() => null);
  console.log(
    account
      ? `Stripe account: ${account.id} (${account.settings?.dashboard?.display_name ?? "unnamed"})`
      : "Stripe account: unreadable with this key (grant Account details: Read to see it)",
  );
  console.log(`Key mode:      ${isLiveKey ? "*** LIVE ***" : "test"}`);
  console.log(
    `Action:        ${execute ? "EXECUTE" : "DRY RUN (pass --execute to apply)"}\n`,
  );

  console.log("Prices:");
  for (const planned of PLAN) {
    await ensurePrice(planned);
  }

  console.log("\nDiscount:");
  await ensureProgrammeCoupon();
  await ensureLaunchPromotionCode();

  console.log("\nCustomer Portal:");
  await ensurePortalConfiguration();

  if (!execute) {
    console.log("\nNothing was changed. Re-run with --execute to apply.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
