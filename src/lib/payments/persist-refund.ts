import "server-only";

import { db } from "@/db";
import { PurchaseStatus } from "@/generated/prisma/client";

// Matched on the payment intent the charge and the first invoice share, which
// is the only link dahlia left between a refund and the purchase it undoes.
// Fulfillment captures it, so this costs no Stripe call.
export async function markPurchaseRefunded({
  stripePaymentIntentId,
  fullyRefunded,
}: {
  stripePaymentIntentId: string;
  fullyRefunded: boolean;
}): Promise<string | null> {
  const purchase = await db.purchase.findUnique({
    where: { stripePaymentIntentId },
    select: { id: true, ref: true },
  });

  if (!purchase) return null;

  // A partial refund is logged but leaves the purchase paid: the customer still
  // bought what they bought.
  if (!fullyRefunded) return purchase.ref;

  await db.purchase.update({
    where: { id: purchase.id },
    data: { status: PurchaseStatus.refunded },
  });

  return purchase.ref;
}
