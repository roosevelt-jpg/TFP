import { createRequire } from "node:module";
import { parseArgs } from "node:util";

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import type Stripe from "stripe";

import {
  Prisma,
  PrismaClient,
  StripeEventStatus,
} from "../src/generated/prisma/client";

// Replays stored Stripe events through the current handlers. Two cases:
//
//   failed     the handler threw and Stripe's retries ran out
//   received   we subscribed to the event before its handler existed, so it
//              was recorded rather than acted on
//
// Every handler is idempotent, so replaying one that already succeeded is a
// no-op. Dry-run by default.
//
//   pnpm redrive:purchases --status failed
//   pnpm redrive:purchases --status received --type invoice.paid --execute
//   pnpm redrive:purchases --id evt_123 --execute
//   pnpm redrive:purchases --status failed --since 2026-07-01 --execute

const USAGE =
  "Usage: pnpm redrive:purchases (--status failed|received | --id <evt_...> ...) [--type <event.type>] [--since <ISO date>] [--limit <n>] [--execute]";

function fail(message: string): never {
  console.error(`${message}\n${USAGE}`);
  process.exit(1);
}

loadEnv({ path: [".env.local", ".env"], quiet: true });

// The handlers are server modules and import "server-only", which throws
// outside a React server context. This script is a server context in every
// sense that matters, so the guard is neutralised rather than worked around by
// duplicating the handler logic here.
const require = createRequire(import.meta.url);
const serverOnly = require.resolve("server-only");
require.cache[serverOnly] = {
  id: serverOnly,
  filename: serverOnly,
  loaded: true,
  exports: {},
} as NodeJS.Module;

const { values } = parseArgs({
  options: {
    status: { type: "string" },
    id: { type: "string", multiple: true },
    type: { type: "string" },
    since: { type: "string" },
    limit: { type: "string" },
    execute: { type: "boolean", default: false },
  },
});

const execute = values.execute === true;
const ids = values.id ?? [];
const limit = values.limit ? Number(values.limit) : 100;

if (!values.status && ids.length === 0) {
  fail("Choose what to replay: --status or --id.");
}
if (values.status && !["failed", "received"].includes(values.status)) {
  fail("--status must be failed or received.");
}
if (!Number.isFinite(limit) || limit < 1) fail("--limit must be a number.");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Imported here so the env is loaded first: the Stripe client validates its
  // key at module load.
  const { replayStoredEvent } = await import(
    "../src/lib/stripe-events/replay-event"
  );
  const { routeEvent } = await import("../src/lib/stripe-events/router");

  const rows = await db.stripeEvent.findMany({
    where: {
      ...(ids.length > 0 ? { id: { in: ids } } : {}),
      ...(values.status
        ? {
            status:
              values.status === "failed"
                ? StripeEventStatus.failed
                : StripeEventStatus.received,
          }
        : {}),
      ...(values.type ? { type: values.type } : {}),
      ...(values.since ? { receivedAt: { gte: new Date(values.since) } } : {}),
      // Without the payload there is nothing to replay; reconcile repairs those.
      payload: { not: Prisma.DbNull },
    },
    orderBy: { receivedAt: "asc" },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      payload: true,
      attempts: true,
    },
  });

  if (rows.length === 0) {
    console.log("Nothing to replay.");
    return;
  }

  console.log(
    `\n${rows.length} event(s)${execute ? "" : " — DRY RUN, pass --execute to apply"}\n`,
  );

  let replayed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const event = row.payload as unknown as Stripe.Event;
    const decision = routeEvent(event);

    if (decision.action === "skip") {
      console.log(`  skip     ${row.id}  ${row.type}  (no handler)`);
      skipped++;
      continue;
    }

    if (!execute) {
      console.log(`  would    ${row.id}  ${row.type}  (${row.status})`);
      replayed++;
      continue;
    }

    const outcome = await replayStoredEvent({
      id: row.id,
      payload: event,
      attempts: row.attempts,
    });

    if (outcome === "failed") {
      // replayStoredEvent already recorded the reason on the row.
      console.log(`  FAILED   ${row.id}  ${row.type}  (see lastError)`);
      failed++;
      continue;
    }

    console.log(
      `  ${outcome === "handled" ? "ok      " : "deferred"} ${row.id}  ${row.type}`,
    );
    replayed++;
  }

  console.log(
    `\n${replayed} replayed, ${skipped} skipped, ${failed} failed${execute ? "" : " (dry run)"}\n`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await db.$disconnect();
    process.exit(1);
  });
