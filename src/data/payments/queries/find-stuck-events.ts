import "server-only";

import type Stripe from "stripe";

import { db } from "@/db";
import { Prisma, StripeEventStatus } from "@/generated/prisma/client";

// Stripe retries a failed delivery for up to three days. Before that window
// closes its own retries are the recovery, and sweeping early would race them.
const GIVE_UP_HOURS = 72;

// Events whose payload is 30 days old cannot be re-fetched from Stripe either,
// so anything older is a permanent hole and not worth retrying nightly.
const RECOVERABLE_DAYS = 30;

export type StuckEvent = {
  id: string;
  type: string;
  payload: Stripe.Event;
  attempts: number;
  receivedAt: Date;
};

// Deliveries that arrived and then stalled: the handler threw until Stripe gave
// up (`failed`), the process died mid-handler (`enqueued`), or we stored the
// event before its handler existed (`received`).
export async function findStuckEvents(limit: number): Promise<StuckEvent[]> {
  const now = Date.now();
  const before = new Date(now - GIVE_UP_HOURS * 60 * 60 * 1000);
  const after = new Date(now - RECOVERABLE_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db.stripeEvent.findMany({
    where: {
      status: {
        in: [
          StripeEventStatus.failed,
          StripeEventStatus.received,
          StripeEventStatus.enqueued,
        ],
      },
      receivedAt: { lt: before, gt: after },
      // Without the payload there is nothing to replay.
      payload: { not: Prisma.DbNull },
    },
    orderBy: { receivedAt: "asc" },
    take: limit,
    select: {
      id: true,
      type: true,
      payload: true,
      attempts: true,
      receivedAt: true,
    },
  });

  return rows.flatMap((row) =>
    isEvent(row.payload) ? [{ ...row, payload: row.payload }] : [],
  );
}

// The column is Json, so its shape is not guaranteed by the type system even
// though every row was written from a signature-verified event. A row that
// cannot be routed is dropped rather than crashing the sweep.
function isEvent(payload: unknown): payload is Stripe.Event {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    "type" in payload &&
    "data" in payload
  );
}
