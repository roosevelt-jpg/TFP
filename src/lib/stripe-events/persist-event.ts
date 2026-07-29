import "server-only";

import type Stripe from "stripe";

import { db } from "@/db";
import { StripeEventStatus } from "@/generated/prisma/enums";

// How long a claim can sit `enqueued` before a retry may take it over. Above
// any real handler duration, below Stripe's first retry interval.
const STALE_CLAIM_SECONDS = 120;

export type RecordOutcome =
  // First delivery, or a retry of one that never got past `received`/`failed`.
  | { proceed: true }
  // Already claimed or settled elsewhere; ack and stop.
  | { proceed: false };

// Claims an event for processing, atomically.
//
// Two properties matter and they pull against each other:
//   1. A duplicate delivery must not be handled twice.
//   2. A delivery whose previous attempt died before doing any work MUST be
//      allowed through, or that payment is lost with no trace. This is why the
//      naive "unique violation => ack" is wrong.
//
// Both are satisfied by moving the decision into single SQL statements, so
// Postgres arbitrates between concurrent deliveries rather than application
// code reading and then writing (which races).
export async function recordStripeEvent(
  event: Stripe.Event,
): Promise<RecordOutcome> {
  // INSERT ... ON CONFLICT DO NOTHING. Exactly one concurrent caller can win
  // the insert; everyone else gets 0 rows and falls through to the reclaim.
  const inserted = await db.$executeRaw`
    INSERT INTO "StripeEvent" ("id", "type", "livemode", "payload", "status", "receivedAt")
    VALUES (
      ${event.id},
      ${event.type},
      ${event.livemode},
      ${JSON.stringify(event)}::jsonb,
      ${StripeEventStatus.enqueued}::"StripeEventStatus",
      NOW()
    )
    ON CONFLICT ("id") DO NOTHING
  `;

  if (inserted === 1) return { proceed: true };

  // The row already exists. Reclaim it only if it is in a non-terminal state,
  // which means a previous attempt crashed before finishing. The WHERE clause
  // is the lock: of N concurrent retries, exactly one UPDATE matches.
  //
  // `enqueued` counts once it has gone stale: the insert above writes that
  // status before the handler runs, so a process killed mid-handler leaves the
  // row claimed by nobody. Without the stale clause Stripe's retry would be
  // acked as a duplicate and the payment lost. The window is longer than any
  // healthy handler and shorter than Stripe's retry schedule.
  const reclaimed = await db.$executeRaw`
    UPDATE "StripeEvent"
    SET "status" = ${StripeEventStatus.enqueued}::"StripeEventStatus",
        "attempts" = "attempts" + 1,
        -- Restarts the staleness clock. Without it the row stays pinned to its
        -- original timestamp, so every later delivery reclaims a live handler.
        "receivedAt" = NOW()
    WHERE "id" = ${event.id}
      AND (
        "status" IN (
          ${StripeEventStatus.received}::"StripeEventStatus",
          ${StripeEventStatus.failed}::"StripeEventStatus"
        )
        OR (
          "status" = ${StripeEventStatus.enqueued}::"StripeEventStatus"
          AND "receivedAt" < NOW() - ${`${STALE_CLAIM_SECONDS} seconds`}::interval
        )
      )
  `;

  return reclaimed === 1 ? { proceed: true } : { proceed: false };
}

export async function markStripeEventStatus(
  eventId: string,
  status: StripeEventStatus,
  lastError?: string,
): Promise<void> {
  await db.stripeEvent.update({
    where: { id: eventId },
    data: {
      status,
      processedAt: new Date(),
      // The tail, not the head: Prisma leads with a long code frame and puts
      // the actual reason last, so slicing from the front stores only noise.
      ...(lastError ? { lastError: lastError.slice(-1500) } : {}),
    },
  });
}
