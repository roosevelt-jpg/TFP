import "server-only";

import { db } from "@/db";

/** True when this email already has a recorded programme purchase. */
export async function customerHasPurchased(email: string): Promise<boolean> {
  const customer = await db.customer.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, purchases: { select: { id: true }, take: 1 } },
  });
  return Boolean(customer?.purchases.length);
}
