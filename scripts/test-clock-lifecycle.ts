import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import Stripe from "stripe";

import { PrismaClient } from "../src/generated/prisma/client";
import { LOOKUP_KEYS } from "../src/lib/payments/prices";

loadEnv({ path: [".env.local", ".env"], quiet: true });

// Walks one membership through its whole first year in a few minutes: day 0
// checkout, the day-53 heads-up, the day-56 first £79, then either a clean
// renewal or a decline that dunning cancels.
//
//   pnpm stripe:lifecycle                       happy path
//   pnpm stripe:lifecycle --decline             card fails at day 56
//   pnpm stripe:lifecycle --email you@x.com --name Ahmed
//                                               day-53 heads-up to a real inbox
//
// Seeds the Customer row a real checkout would have written, then drives Stripe
// and lets the webhook do the rest. Run `pnpm dev` alongside so events reach the
// local endpoint; each step prints what Stripe says and what we stored.

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY is required");
if (key.startsWith("sk_live") || key.startsWith("rk_live")) {
  throw new Error("Refusing to run against a live key");
}

const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const decline = process.argv.includes("--decline");

const emailFlag = process.argv.indexOf("--email");
const emailOverride =
  emailFlag !== -1 ? process.argv[emailFlag + 1] : undefined;

if (emailFlag !== -1 && !emailOverride?.includes("@")) {
  throw new Error("--email needs an address");
}

const nameFlag = process.argv.indexOf("--name");
// Reaches the buyer as "Ahmed, that's your eight weeks done", so a real run
// wants a real first name.
const buyerName = nameFlag !== -1 ? process.argv[nameFlag + 1] : "Clock Test";

// Stands in for what fulfillment writes after a real checkout.
async function seedCustomer(input: {
  email: string;
  stripeCustomerId: string;
}) {
  await db.customer.create({
    data: {
      email: input.email,
      stripeCustomerId: input.stripeCustomerId,
      name: buyerName,
      whatsapp: `+44770090${Math.floor(Math.random() * 9000 + 1000)}`,
      consentText: "test clock",
      policyVersion: "test",
    },
  });
}

const DAY = 86_400;
const HOUR = 3_600;

// Stripe leaves a new invoice in draft for about an hour, so every advance
// lands slightly past the boundary to see the finalized, paid result.
async function advanceTo(clockId: string, to: number, label: string) {
  process.stdout.write(`  ${label.padEnd(34)}`);
  await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: to });

  for (let i = 0; i < 60; i++) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === "ready") {
      console.log("ok");
      return;
    }
    if (clock.status === "internal_failure") {
      throw new Error("test clock failed to advance");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("test clock did not become ready");
}

// Prints Stripe's view beside ours. A mismatch is the whole point of the run.
async function report(subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const invoices = await stripe.invoices.list({
    subscription: subscriptionId,
    limit: 5,
  });
  const paid = invoices.data
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount_paid, 0);

  // The webhook is in flight, so give it a moment before reading back.
  await new Promise((r) => setTimeout(r, 1500));
  const row = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { status: true },
  });

  const ours = row?.status ?? "no row";
  const agree = ours === sub.status ? "" : "   <-- MISMATCH";
  console.log(
    `    stripe ${sub.status.padEnd(10)} ours ${ours.padEnd(10)} £${(paid / 100).toFixed(2)}${agree}`,
  );
  return { stripe: sub.status, ours };
}

async function main() {
  const prices = await stripe.prices.list({
    lookup_keys: [LOOKUP_KEYS.programme, LOOKUP_KEYS.membership],
    limit: 2,
  });
  const membership = prices.data.find(
    (p) => p.lookup_key === LOOKUP_KEYS.membership,
  );
  const programme = prices.data.find(
    (p) => p.lookup_key === LOOKUP_KEYS.programme,
  );
  if (!membership || !programme) {
    throw new Error("Run `pnpm stripe:bootstrap -- --execute` first");
  }

  const start = Math.floor(Date.now() / 1000);
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: start,
    name: decline ? "Formula lifecycle (decline)" : "Formula lifecycle",
  });
  console.log(`\nsimulation ${clock.id}${decline ? " — card declines" : ""}\n`);

  // 4242 always succeeds. 0341 attaches fine and fails when charged, which the
  // trial defers to day 56 — a renewal failure rather than a checkout failure.
  const card = decline ? "pm_card_chargeCustomerFail" : "pm_card_visa";
  // --email you@example.com sends the day-53 heads-up somewhere real. Stripe
  // cannot attach an existing customer to a test clock, so this run is always a
  // separate subscription from any live checkout.
  const email = emailOverride ?? `clock-${start}@example.com`;
  const customer = await stripe.customers.create({
    email,
    name: buyerName,
    phone: "+447700900123",
    test_clock: clock.id,
    payment_method: card,
    invoice_settings: { default_payment_method: card },
  });

  // Mirrors what our Checkout Session builds: £149 today, £79 deferred 56 days.
  // The decline run omits the £149, because card 0341 fails whenever it is
  // charged: billing it on day 0 would kill the subscription before it ever
  // reached the renewal this run exists to test.
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: membership.id }],
    trial_period_days: 56,
    ...(decline ? {} : { add_invoice_items: [{ price: programme.id }] }),
    metadata: { name: buyerName, whatsapp: "+447700900123" },
  });

  // The lifecycle handlers resolve ownership through our Customer row, so
  // without this the whole run is a no-op that only proves the webhook acks.
  await seedCustomer({ email, stripeCustomerId: customer.id });

  console.log(`  day 0    ${subscription.status}`);
  await report(subscription.id);

  await advanceTo(clock.id, start + 53 * DAY, "day 53  trial_will_end");
  await report(subscription.id);

  await advanceTo(clock.id, start + 56 * DAY + HOUR, "day 56  first £79");
  const afterRenewal = await report(subscription.id);

  if (!decline) {
    await advanceTo(clock.id, start + 86 * DAY + HOUR, "day 86  second £79");
    await report(subscription.id);
    console.log(
      `\nexpected day 56: active in both. got stripe=${afterRenewal.stripe} ours=${afterRenewal.ours}.\n`,
    );
  } else {
    // Smart Retries spreads 8 attempts over two weeks, and each needs the clock
    // to actually reach it. Jumping straight to the end skips them all and
    // leaves the subscription sitting in past_due.
    for (const day of [59, 63, 67, 71]) {
      await advanceTo(clock.id, start + day * DAY + HOUR, `day ${day}  retry`);
      await report(subscription.id);
    }
    const final = await report(subscription.id);
    console.log(
      `\nexpected: past_due then canceled in both. got stripe=${final.stripe} ours=${final.ours}.\n`,
    );
  }

  console.log(
    `Delete when done:  stripe test_helpers test_clocks delete ${clock.id} --project-name=formula\n`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await db.$disconnect();
    process.exit(1);
  });
