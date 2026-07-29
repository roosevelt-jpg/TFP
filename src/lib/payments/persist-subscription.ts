import "server-only";

import type Stripe from "stripe";

import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

import { isUniqueViolation } from "./prisma-errors";
import { toSubscriptionStatus } from "./subscription-status";

function toDate(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

export async function upsertSubscription(
  tx: Prisma.TransactionClient,
  customerId: string,
  subscription: Stripe.Subscription,
  eventCreated: number,
): Promise<void> {
  const item = subscription.items.data[0];
  const priceId = item?.price.id;
  if (!priceId) return;

  const status = toSubscriptionStatus(subscription.status);
  if (!status) {
    logger.error("Unknown Stripe subscription status", undefined, {
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
    });
    return;
  }

  const fields = {
    stripePriceId: priceId,
    status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: toDate(item?.current_period_start),
    currentPeriodEnd: toDate(item?.current_period_end),
    trialEnd: toDate(subscription.trial_end),
    canceledAt: toDate(subscription.canceled_at),
    lastStripeEventCreated: eventCreated,
  };

  // Fenced write: an event older than the last one applied matches nothing, so a
  // stale delivery can't clobber newer state. Prisma's upsert takes no condition
  // on its update branch, hence two statements — and count 0 is ambiguous (no row
  // yet, or a newer row), which the unique constraint below disambiguates.
  const updated = await tx.subscription.updateMany({
    where: {
      stripeSubscriptionId: subscription.id,
      lastStripeEventCreated: { lte: eventCreated },
    },
    data: fields,
  });

  if (updated.count > 0) return;

  await tx.subscription
    .create({
      data: { stripeSubscriptionId: subscription.id, customerId, ...fields },
    })
    .catch((error: unknown) => {
      // The row existed and was newer, or a concurrent ingress just created it.
      // Either way the stored state is at least as fresh as ours.
      if (!isUniqueViolation(error)) throw error;
    });
}
