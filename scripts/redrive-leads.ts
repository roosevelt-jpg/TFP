import { parseArgs } from "node:util";

import { PrismaPg } from "@prisma/adapter-pg";
import { tasks } from "@trigger.dev/sdk";
import { config as loadEnv } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { firstNameOf } from "../src/lib/name";
import type { sendWelcomeEmail } from "../src/trigger/send-welcome-email";
import type { syncGhlContact } from "../src/trigger/sync-ghl-contact";

// Re-enqueues the welcome email and/or GHL sync for leads whose fire-and-forget
// enqueue was lost (Trigger outage, deploy blip). Dry-run by default. Uses the
// same idempotencyKey as the join action, so a recent successful enqueue is
// deduped rather than doubled; the email task's Resend idempotency key (24h)
// guards the send itself.
//
// Usage:
//   pnpm redrive --ref WL-ABC123 [--ref WL-DEF456] [--only email|ghl] [--execute]
//   pnpm redrive --since 2026-07-06T18:00:00Z [--only email|ghl] [--execute]

const USAGE =
  "Usage: pnpm redrive (--ref <WL-...> ... | --since <ISO date>) [--only email|ghl] [--execute]";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

loadEnv({ path: [".env.local", ".env"], quiet: true });

const { values } = parseArgs({
  options: {
    ref: { type: "string", multiple: true },
    since: { type: "string" },
    only: { type: "string" },
    execute: { type: "boolean", default: false },
  },
});

const refs = values.ref ?? [];
const since = values.since ? new Date(values.since) : undefined;
const only = values.only;

if (refs.length === 0 && !since) fail(USAGE);
if (since && Number.isNaN(since.getTime())) {
  fail(`Invalid --since date: ${values.since}\n${USAGE}`);
}
if (only && only !== "email" && only !== "ghl") {
  fail(`Invalid --only value: ${only}\n${USAGE}`);
}
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set");
if (values.execute && !process.env.TRIGGER_SECRET_KEY) {
  fail("TRIGGER_SECRET_KEY is not set (required with --execute)");
}

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  }),
});

async function main(): Promise<void> {
  const leads = await db.waitlist.findMany({
    where:
      refs.length > 0 ? { ref: { in: refs } } : { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  if (refs.length > 0 && leads.length < refs.length) {
    const found = new Set(leads.map((l) => l.ref));
    for (const ref of refs.filter((r) => !found.has(r))) {
      console.warn(`No lead found for ref ${ref}`);
    }
  }

  console.log(`Matched ${leads.length} lead(s):`);
  for (const lead of leads) {
    console.log(
      `  ${lead.ref}  ${lead.createdAt.toISOString()}  ${lead.email}`,
    );
  }

  if (!values.execute) {
    console.log("\nDry run — pass --execute to re-enqueue.");
    return;
  }

  let failures = 0;

  for (const lead of leads) {
    const opts = { idempotencyKey: lead.ref, idempotencyKeyTTL: "1h" };

    if (only !== "ghl") {
      try {
        const run = await tasks.trigger<typeof sendWelcomeEmail>(
          "send-welcome-email",
          {
            email: lead.email,
            firstName: firstNameOf(lead.name),
            ref: lead.ref,
          },
          opts,
        );
        console.log(`  ${lead.ref}  welcome email enqueued (${run.id})`);
      } catch (error) {
        failures++;
        console.error(`  ${lead.ref}  welcome email FAILED: ${error}`);
      }
    }

    if (only !== "email") {
      try {
        const run = await tasks.trigger<typeof syncGhlContact>(
          "sync-ghl-contact",
          {
            name: lead.name,
            email: lead.email,
            phone: lead.whatsapp,
            ref: lead.ref,
            goal: lead.goal,
            level: lead.level,
            sex: lead.sex,
            age: lead.age,
            heightCm: lead.heightCm,
            weightKg: lead.weightKg,
            goalWeightKg: lead.goalWeightKg,
            diet: lead.diet,
            injuries: lead.injuries,
          },
          opts,
        );
        console.log(`  ${lead.ref}  GHL sync enqueued (${run.id})`);
      } catch (error) {
        failures++;
        console.error(`  ${lead.ref}  GHL sync FAILED: ${error}`);
      }
    }
  }

  if (failures > 0) fail(`\n${failures} enqueue(s) failed — rerun to retry.`);
  console.log("\nDone.");
}

main()
  .catch((error) => fail(String(error)))
  .finally(() => db.$disconnect());
