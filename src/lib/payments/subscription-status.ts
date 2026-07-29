import type Stripe from "stripe";

import { SubscriptionStatus } from "@/generated/prisma/client";

// Our enum mirrors Stripe's values one-for-one, and `satisfies` makes that a
// compile error if either side drifts. Returns null for anything Stripe adds
// later: the caller alerts and leaves the row alone rather than writing a status
// we don't understand.
const STATUSES = {
  incomplete: SubscriptionStatus.incomplete,
  incomplete_expired: SubscriptionStatus.incomplete_expired,
  trialing: SubscriptionStatus.trialing,
  active: SubscriptionStatus.active,
  past_due: SubscriptionStatus.past_due,
  canceled: SubscriptionStatus.canceled,
  unpaid: SubscriptionStatus.unpaid,
  paused: SubscriptionStatus.paused,
} satisfies Record<Stripe.Subscription.Status, SubscriptionStatus>;

export function toSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus | null {
  return STATUSES[status] ?? null;
}
