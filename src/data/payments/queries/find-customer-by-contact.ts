import "server-only";

import { db } from "@/db";
import { SubscriptionStatus } from "@/generated/prisma/client";

// past_due counts: they're in dunning, still have access, and must not be sold
// a second place.
const LIVE_STATUSES = [
  SubscriptionStatus.trialing,
  SubscriptionStatus.active,
  SubscriptionStatus.past_due,
  SubscriptionStatus.unpaid,
  SubscriptionStatus.incomplete,
];

export type ExistingCustomer = {
  id: string;
  email: string;
  whatsapp: string;
  stripeCustomerId: string;
  hasLiveSubscription: boolean;
};

// Matched on email OR whatsapp because both are unique and either one being
// taken means this is the same person — the same rule GHL's upsert applies.
export async function findCustomerByContact(
  email: string,
  whatsapp: string,
): Promise<ExistingCustomer | null> {
  const customer = await db.customer.findFirst({
    where: { OR: [{ email }, { whatsapp }] },
    select: {
      id: true,
      email: true,
      whatsapp: true,
      stripeCustomerId: true,
      subscriptions: {
        where: { status: { in: LIVE_STATUSES } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!customer) return null;

  return {
    id: customer.id,
    email: customer.email,
    whatsapp: customer.whatsapp,
    stripeCustomerId: customer.stripeCustomerId,
    hasLiveSubscription: customer.subscriptions.length > 0,
  };
}
