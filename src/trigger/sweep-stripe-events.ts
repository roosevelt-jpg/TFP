import { logger, schedules } from "@trigger.dev/sdk";

import { findStuckEvents } from "@/data/payments/queries/find-stuck-events";
import { replayStoredEvent } from "@/lib/stripe-events/replay-event";

// Enough to clear a bad night in one run, bounded so a systemic failure cannot
// spend an hour retrying the same broken handler.
const BATCH = 200;

export const sweepStripeEvents = schedules.task({
  id: "sweep-stripe-events",
  // 02:45 UTC, half an hour before the GHL reconcile: a payment recovered here
  // produces tags that tonight's reconcile then checks, rather than tomorrow's.
  cron: {
    pattern: "45 2 * * *",
    environments: ["PRODUCTION"],
  },
  machine: "micro",
  ttl: "1h",
  maxDuration: 600,
  run: async () => {
    const events = await findStuckEvents(BATCH);

    if (events.length === 0) {
      logger.info("No stuck Stripe events");
      return { checked: 0, recovered: 0, failed: 0, skipped: 0 };
    }

    // Every one of these is a delivery Stripe has given up on, so reaching this
    // point at all means the webhook missed something.
    logger.warn("Replaying Stripe events that outlived Stripe's retries", {
      count: events.length,
      oldest: events[0]?.receivedAt,
    });

    let recovered = 0;
    let failed = 0;
    let skipped = 0;

    for (const event of events) {
      const result = await replayStoredEvent(event);

      if (result === "failed") {
        failed++;
        // Already recorded on the row by the replay; this is what pages.
        logger.error("Stuck Stripe event failed again on replay", {
          stripeEventId: event.id,
          type: event.type,
          attempts: event.attempts + 1,
        });
        continue;
      }

      if (result === "skipped" || result === "deferred") {
        skipped++;
        continue;
      }

      recovered++;
      logger.info("Recovered a Stripe event the webhook lost", {
        stripeEventId: event.id,
        type: event.type,
        receivedAt: event.receivedAt,
      });
    }

    const summary = {
      checked: events.length,
      recovered,
      failed,
      skipped,
    };

    logger.info("Stripe event sweep finished", summary);

    return summary;
  },
  onFailure: async ({ error }) => {
    logger.error("Stripe event sweep failed; stuck events stay stuck", {
      error,
    });
  },
});
