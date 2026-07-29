import "server-only";

import type Stripe from "stripe";

import { logger } from "@/lib/logger";
import { syncStripeSubscriptionState } from "@/lib/payments/sync-subscription";

// dahlia removed invoice.subscription; the link moved under parent.
export function readSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

// Day 56 and every month after. Also the recovery path: a successful retry
// during dunning lands here and flips the row back to active.
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  eventCreated: number,
): Promise<void> {
  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  const result = await syncStripeSubscriptionState(
    subscriptionId,
    eventCreated,
  );

  if (result.state === "synced" && result.from === "past_due") {
    logger.info("Membership recovered after dunning", {
      stripeSubscriptionId: subscriptionId,
      to: result.to,
    });
  }
}

// Stripe's Smart Retries own the recovery schedule and the customer emails. Our
// job is only to mirror the state so access reflects it.
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  eventCreated: number,
): Promise<void> {
  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  await syncStripeSubscriptionState(subscriptionId, eventCreated);

  logger.warn("Membership payment failed", {
    stripeSubscriptionId: subscriptionId,
    attemptCount: invoice.attempt_count,
    nextAttempt: invoice.next_payment_attempt,
    // A hard decline schedules retries that never execute until the customer
    // supplies a new card, so this number alone doesn't mean recovery is coming.
    amountDue: invoice.amount_due,
  });
}

// The customer's bank wants SCA. Stripe emails them a hosted link; we only need
// the state mirrored and a breadcrumb.
export async function handleInvoiceActionRequired(
  invoice: Stripe.Invoice,
  eventCreated: number,
): Promise<void> {
  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  await syncStripeSubscriptionState(subscriptionId, eventCreated);

  logger.warn("Membership payment needs customer action", {
    stripeSubscriptionId: subscriptionId,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  });
}

// Needs a human: the subscription stays active and the customer keeps access
// while collection is impossible, so this is silent revenue loss until someone
// looks.
export function handleInvoiceFinalizationFailed(invoice: Stripe.Invoice): void {
  logger.error("Invoice could not be finalized", undefined, {
    invoiceId: invoice.id,
    reason: invoice.last_finalization_error?.message ?? "unknown",
    code: invoice.last_finalization_error?.code ?? null,
  });
}
