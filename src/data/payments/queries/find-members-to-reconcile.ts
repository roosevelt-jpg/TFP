import "server-only";

import { db } from "@/db";
import { PurchaseStatus, SubscriptionStatus } from "@/generated/prisma/enums";

// Mirrors findCustomerByContact: dunning still counts as entitled, because they
// have access until Stripe gives up retrying.
const LIVE_STATUSES = [
  SubscriptionStatus.trialing,
  SubscriptionStatus.active,
  SubscriptionStatus.past_due,
  SubscriptionStatus.unpaid,
];

export type MemberToReconcile = {
  customerId: string;
  purchaseRef: string;
  name: string;
  email: string;
  whatsapp: string;
  entitled: boolean;
  syncedAt: Date | null;
};

// Everyone who has ever paid. Cancelled members are included deliberately:
// their tags are exactly the ones most likely to be stale.
export async function findMembersToReconcile(
  limit: number,
): Promise<MemberToReconcile[]> {
  const purchases = await db.purchase.findMany({
    where: { status: { in: [PurchaseStatus.paid, PurchaseStatus.refunded] } },
    orderBy: { purchasedAt: "desc" },
    take: limit,
    select: {
      ref: true,
      status: true,
      ghlSyncedAt: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
          subscriptions: {
            where: { status: { in: LIVE_STATUSES } },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  return purchases.map((purchase) => ({
    customerId: purchase.customer.id,
    purchaseRef: purchase.ref,
    name: purchase.customer.name,
    email: purchase.customer.email,
    whatsapp: purchase.customer.whatsapp,
    // A refund revokes entitlement even while the subscription runs on, so
    // both have to agree before we treat someone as a member.
    entitled:
      purchase.status === PurchaseStatus.paid &&
      purchase.customer.subscriptions.length > 0,
    syncedAt: purchase.ghlSyncedAt,
  }));
}
