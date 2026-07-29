import "server-only";

import { tasks } from "@trigger.dev/sdk";

import { logger } from "@/lib/logger";
import type { sendTrialEnding } from "@/trigger/send-trial-ending";

// Runs inside the webhook, so it must not throw: a non-2xx would make Stripe
// delay finalizing invoices for up to 72 hours, which is a far worse failure
// than a missing heads-up email.
export async function enqueueTrialEnding(
  stripeSubscriptionId: string,
): Promise<void> {
  try {
    await tasks.trigger<typeof sendTrialEnding>(
      "send-trial-ending",
      { stripeSubscriptionId },
      {
        // Stripe fires trial_will_end as a distinct event if the trial date is
        // changed, so this is keyed on the subscription rather than the event.
        // The ledger column is the real guarantee; this only spares the queue.
        idempotencyKey: `trial-ending:${stripeSubscriptionId}`,
        idempotencyKeyTTL: "30d",
        queue: "email",
      },
    );
  } catch (error) {
    logger.error("Could not enqueue the trial heads-up", error, {
      stripeSubscriptionId,
    });
  }
}
