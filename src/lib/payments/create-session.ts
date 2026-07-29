import "server-only";

import type Stripe from "stripe";

import { stripe } from "@/lib/clients/stripe";
import { logger } from "@/lib/logger";

// Stripe rejects a reused idempotency key whose parameters have changed rather
// than replaying the original, and the key lives for an hour. So a buyer who
// corrects their name and resubmits inside that window would be told to try
// again, and every retry would fail identically until the hour rolled over.
//
// The key exists to swallow a double-clicked submit, not to freeze the buyer's
// details. When the parameters genuinely differ they want a new session, so the
// collision is recoverable: retry once unkeyed. That reopens the double-submit
// window for one request, which is the lesser harm — a duplicate *session* is
// harmless (only one can be paid), whereas a buyer who cannot pay is a lost
// sale.
export async function createCheckoutSessionForBuyer({
  params,
  idempotencyKey,
}: {
  params: Stripe.Checkout.SessionCreateParams;
  idempotencyKey: string;
}): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.create(params, { idempotencyKey });
  } catch (error) {
    if (!isIdempotencyConflict(error)) throw error;

    logger.warn("Checkout params changed inside the idempotency window", {
      stripeCustomerId:
        typeof params.customer === "string" ? params.customer : undefined,
    });

    return stripe.checkout.sessions.create(params);
  }
}

function isIdempotencyConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "StripeIdempotencyError"
  );
}
