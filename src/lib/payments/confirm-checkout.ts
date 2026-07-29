import "server-only";

import { findFulfilledSession } from "@/data/payments/queries/find-fulfilled-session";
import { logger } from "@/lib/logger";
import { firstNameOf } from "@/lib/name";

import { fulfillCheckout } from "./fulfill-checkout";
import { isWithinOnboardingWindow } from "./onboarding-window";

export type ConfirmedCheckout =
  | {
      state: "paid";
      ref: string;
      firstName: string;
      customerId: string;
      sessionId: string;
      amountTotal: number;
      currency: string;
    }
  | { state: "processing" }
  | { state: "invalid" };

export async function confirmCheckout(
  sessionId: string,
): Promise<ConfirmedCheckout> {
  // Already fulfilled: serve from our own row rather than paying for a Stripe
  // retrieve and a transaction on every reload. Correctness is unchanged —
  // fulfillment is idempotent, so re-running it only ever confirmed what this
  // read already knows.
  const settled = await findFulfilledSession(sessionId);

  if (settled) {
    return isWithinOnboardingWindow(settled.purchasedAt)
      ? {
          state: "paid",
          ref: settled.ref,
          firstName: firstNameOf(settled.name),
          customerId: settled.customerId,
          sessionId,
          amountTotal: settled.amountTotal,
          currency: settled.currency,
        }
      : { state: "invalid" };
  }

  // Stripe's recommended second ingress, so a delayed webhook doesn't leave a
  // paying customer on an empty page. Failures are swallowed here on purpose:
  // the webhook is the guarantee, and someone who has paid should never meet a
  // crash. The event stays `failed` for redrive either way.
  const result = await fulfillCheckout(sessionId).catch((error: unknown) => {
    logger.error("Fulfillment failed on the success page", error, {
      sessionId,
    });

    return { state: "invalid" } as const;
  });

  if (result.state === "unpaid") return { state: "processing" };
  if (result.state === "invalid") return { state: "invalid" };

  if (!isWithinOnboardingWindow(result.createdAt)) {
    return { state: "invalid" };
  }

  return {
    state: "paid",
    ref: result.ref,
    firstName: result.firstName,
    customerId: result.customerId,
    sessionId,
    amountTotal: result.amountTotal,
    currency: result.currency,
  };
}
