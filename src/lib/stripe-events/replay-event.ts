import "server-only";

import type Stripe from "stripe";

import { db } from "@/db";
import { StripeEventStatus } from "@/generated/prisma/enums";

import { handleStripeEvent } from "./handle-event";
import { routeEvent } from "./router";

export type ReplayResult = "handled" | "deferred" | "skipped" | "failed";

// Re-runs one stored event through the current handlers and records what
// happened. Shared by the redrive script and the nightly sweeper so a replay
// means the same thing whether a human or a cron started it.
//
// Every handler is idempotent, so replaying one that already succeeded is a
// no-op rather than a double-charge or a second email.
export async function replayStoredEvent(row: {
  id: string;
  // Already signature-verified when it was stored; the column is Json only
  // because that is how Postgres holds it.
  payload: Stripe.Event;
  attempts: number;
}): Promise<ReplayResult> {
  const decision = routeEvent(row.payload);

  // Subscribed to, but nothing handles it yet. Left as-is so a later phase can
  // find and replay it once the handler exists.
  if (decision.action === "skip") return "skipped";

  try {
    const outcome = await handleStripeEvent(row.payload, decision.kind);

    await db.stripeEvent.update({
      where: { id: row.id },
      data: {
        status:
          outcome === "handled"
            ? StripeEventStatus.processed
            : StripeEventStatus.received,
        attempts: row.attempts + 1,
        processedAt: new Date(),
        // Cleared on success, or a recovered row still reads as broken to
        // whoever is debugging the next incident.
        lastError: null,
      },
    });

    return outcome;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await db.stripeEvent.update({
      where: { id: row.id },
      data: {
        status: StripeEventStatus.failed,
        attempts: row.attempts + 1,
        // The tail, not the head: Prisma leads with a code frame and puts the
        // actual reason last.
        lastError: message.slice(-1500),
      },
    });

    return "failed";
  }
}
