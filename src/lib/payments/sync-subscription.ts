import "server-only";

import { getStripe } from "@/lib/clients/stripe";
import { logger } from "@/lib/logger";
import { db } from "@/db";

import { enqueueMembershipState } from "./enqueue-ghl";
import { upsertSubscription } from "./persist-subscription";

export type SyncOutcome =
  // Applied, with the status transition it caused. `from` is null on first sight.
  | { state: "synced"; from: string | null; to: string }
  // Not ours: a PRO/ELITE subscription sharing the Stripe account.
  | { state: "not_programme" }
  // No customer of ours owns it, or Stripe wouldn't return it.
  | { state: "unknown" };

// Every subscription and invoice event collapses here rather than each patching
// its own fields. Canonical state is re-fetched from Stripe, so the event that
// woke us only decides which side effects fire, never what the row becomes —
// which is what makes out-of-order delivery survivable.
export async function syncStripeSubscriptionState(
  stripeSubscriptionId: string,
  eventCreated: number,
): Promise<SyncOutcome> {
  const stripe = await getStripe();
  const subscription = await stripe.subscriptions
    .retrieve(stripeSubscriptionId)
    .catch((error: unknown) => {
      logger.warn("Could not retrieve subscription for sync", {
        stripeSubscriptionId,
        reason: error instanceof Error ? error.message : "unknown",
      });
      return null;
    });

  if (!subscription) return { state: "unknown" };

  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const [existing, customer] = await Promise.all([
    db.subscription.findUnique({
      where: { stripeSubscriptionId },
      select: { status: true, customerId: true },
    }),
    db.customer.findUnique({
      where: { stripeCustomerId },
      select: { id: true },
    }),
  ]);

  // The Shopify catalogue and the client's hand-sold PRO/ELITE tiers live in
  // this same Stripe account, so their events reach us too. Nothing to do.
  const customerId = existing?.customerId ?? customer?.id;
  if (!customerId) {
    logger.info("Subscription belongs to no customer of ours", {
      stripeSubscriptionId,
    });
    return { state: "not_programme" };
  }

  await db.$transaction(async (tx) => {
    await upsertSubscription(tx, customerId, subscription, eventCreated);
  });

  // Read back rather than assume: the fence may have rejected this write, and
  // side effects must key off what is actually stored.
  const applied = await db.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { status: true },
  });

  logger.info("Subscription synced", {
    stripeSubscriptionId,
    customerId,
    from: existing?.status ?? null,
    to: applied?.status ?? subscription.status,
  });

  const to = applied?.status ?? null;

  // Only when the stored state actually moved: an event the fence rejected, or
  // a redelivery of one already applied, must not re-tag the contact.
  if (to && to !== existing?.status) {
    await enqueueMembershipState({
      customerId,
      stripeSubscriptionId,
      status: to,
      eventId: `${stripeSubscriptionId}:${eventCreated}`,
    });
  }

  return {
    state: "synced",
    from: existing?.status ?? null,
    to: to ?? subscription.status,
  };
}
