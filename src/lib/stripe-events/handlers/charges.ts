import "server-only";

import type Stripe from "stripe";

import { logger } from "@/lib/logger";
import { markPurchaseRefunded } from "@/lib/payments/persist-refund";

// The client's policy is that a refunded customer keeps their access, so this
// records the money and nothing else.
export async function handleChargeRefunded(
  charge: Stripe.Charge,
): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);

  if (!paymentIntentId) return;

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const purchaseRef = await markPurchaseRefunded({
    stripePaymentIntentId: paymentIntentId,
    fullyRefunded,
  });

  // No match means a Shopify order or a hand-sold tier, which is expected
  // traffic on this shared account.
  if (!purchaseRef) return;

  logger.info("Purchase refunded", {
    purchaseRef,
    amountRefunded: charge.amount_refunded,
    fullyRefunded,
  });
}

// Money is being pulled back and there is a deadline to respond, so this exists
// to put a human in the loop rather than to change any state.
export function handleDisputeCreated(dispute: Stripe.Dispute): void {
  logger.error("Payment disputed", undefined, {
    disputeId: dispute.id,
    amount: dispute.amount,
    reason: dispute.reason,
    evidenceDueBy: dispute.evidence_details?.due_by ?? null,
  });
}
