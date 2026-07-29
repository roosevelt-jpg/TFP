import "server-only";

import { db } from "@/db";
import { PurchaseStatus } from "@/generated/prisma/client";

export type FulfilledSession = {
  ref: string;
  customerId: string;
  name: string;
  purchasedAt: Date | null;
  amountTotal: number;
  currency: string;
};

// Everything the success page renders, from one indexed read. Present only when
// fulfillment has already completed for this session, which lets repeat views
// skip a Stripe round trip and a transaction.
export async function findFulfilledSession(
  sessionId: string,
): Promise<FulfilledSession | null> {
  const purchase = await db.purchase.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    select: {
      ref: true,
      customerId: true,
      purchasedAt: true,
      amountTotal: true,
      currency: true,
      status: true,
      customer: { select: { name: true } },
    },
  });

  if (purchase?.status !== PurchaseStatus.paid) return null;

  return {
    ref: purchase.ref,
    customerId: purchase.customerId,
    name: purchase.customer.name,
    purchasedAt: purchase.purchasedAt,
    amountTotal: purchase.amountTotal,
    currency: purchase.currency,
  };
}
