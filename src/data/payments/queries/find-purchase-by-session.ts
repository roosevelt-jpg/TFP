import "server-only";

import { db } from "@/db";
import { PurchaseStatus } from "@/generated/prisma/client";

// Authenticates a session id against an already-fulfilled purchase without
// re-running fulfillment: callers only need to know whose purchase this is.
export async function findPaidPurchaseBySession(sessionId: string): Promise<{
  customerId: string;
  ref: string;
  purchasedAt: Date | null;
  stripeCustomerId: string;
} | null> {
  const purchase = await db.purchase.findFirst({
    where: {
      stripeCheckoutSessionId: sessionId,
      status: PurchaseStatus.paid,
    },
    select: {
      customerId: true,
      ref: true,
      purchasedAt: true,
      customer: { select: { stripeCustomerId: true } },
    },
  });

  if (!purchase) return null;

  return {
    customerId: purchase.customerId,
    ref: purchase.ref,
    purchasedAt: purchase.purchasedAt,
    stripeCustomerId: purchase.customer.stripeCustomerId,
  };
}
