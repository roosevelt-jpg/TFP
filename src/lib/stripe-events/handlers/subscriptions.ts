import "server-only";

import type Stripe from "stripe";

import { logger } from "@/lib/logger";
import { enqueueTrialEnding } from "@/lib/payments/enqueue-trial-ending";
import { syncStripeSubscriptionState } from "@/lib/payments/sync-subscription";

// created and updated collapse here: the sync re-fetches canonical state, so
// which event woke it doesn't matter. Covers a portal cancellation setting
// cancel_at_period_end, a plan change, and the trial ending into active.
export async function handleSubscriptionChanged(
  subscription: Stripe.Subscription,
  eventCreated: number,
): Promise<void> {
  const result = await syncStripeSubscriptionState(
    subscription.id,
    eventCreated,
  );

  if (result.state === "synced" && subscription.cancel_at_period_end) {
    logger.info("Membership set to cancel at period end", {
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null,
    });
  }
}

// Terminal. Reached by a portal cancellation running to term, or by Smart
// Retries exhausting with the account set to cancel.
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventCreated: number,
): Promise<void> {
  await syncStripeSubscriptionState(subscription.id, eventCreated);

  logger.info("Membership ended", {
    stripeSubscriptionId: subscription.id,
    canceledAt: subscription.canceled_at,
  });
}

// ~3 days before the first £79. The heads-up email hangs off this once the
// email infrastructure lands; the state sync is useful on its own.
export async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  eventCreated: number,
): Promise<void> {
  await syncStripeSubscriptionState(subscription.id, eventCreated);

  logger.info("Membership trial ending", {
    stripeSubscriptionId: subscription.id,
    trialEnd: subscription.trial_end,
  });

  // After the sync, so the task reads the trial end date this event carried.
  await enqueueTrialEnding(subscription.id);
}
