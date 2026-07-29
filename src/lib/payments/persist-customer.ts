import "server-only";

import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

import type { SessionDetails } from "./read-session";

// Identity spans three unique columns, which no single-key upsert can express:
// a buyer whose email matches one row and phone another cannot be written
// without deciding which row is them. Resolve first, then update by primary
// key, so a unique value is never moved onto one another row already holds —
// that throws P2002 after the money is taken and Stripe retries it forever.
//
// Match order follows Stripe's own connector model: the stored Stripe id is the
// durable link, email and phone are only matching fields.
export async function upsertCustomer(
  tx: Prisma.TransactionClient,
  details: SessionDetails,
): Promise<string> {
  const [byStripeId, byEmail, byPhone] = await Promise.all([
    tx.customer.findUnique({
      where: { stripeCustomerId: details.stripeCustomerId },
      select: { id: true },
    }),
    tx.customer.findUnique({
      where: { email: details.email },
      select: { id: true },
    }),
    tx.customer.findUnique({
      where: { whatsapp: details.whatsapp },
      select: { id: true },
    }),
  ]);

  const target = byStripeId ?? byEmail ?? byPhone;

  if (!target) {
    // ON CONFLICT DO NOTHING, then read back, rather than a plain create: two
    // events for the same buyer can land together and the loser of a plain
    // create throws after the money is taken. Postgres arbitrates, not us.
    await tx.customer.createMany({
      data: [
        {
          stripeCustomerId: details.stripeCustomerId,
          email: details.email,
          name: details.name,
          whatsapp: details.whatsapp,
          consentText: details.consentText,
          policyVersion: details.policyVersion,
          ...(details.waitlistId ? { waitlistId: details.waitlistId } : {}),
        },
      ],
      skipDuplicates: true,
    });

    const settled = await tx.customer.findFirst({
      where: {
        OR: [
          { stripeCustomerId: details.stripeCustomerId },
          { email: details.email },
          { whatsapp: details.whatsapp },
        ],
      },
      select: { id: true },
    });

    if (!settled) throw new Error("customer vanished between write and read");
    return settled.id;
  }

  // Only write a unique field when no other row holds it. Anything else is a
  // genuine conflict: keep both rows intact, record it, let support merge them.
  const emailFree = !byEmail || byEmail.id === target.id;
  const phoneFree = !byPhone || byPhone.id === target.id;

  if (!emailFree || !phoneFree) {
    logger.error("Checkout details conflict with another customer", undefined, {
      customerId: target.id,
      conflictOn: !emailFree ? "email" : "whatsapp",
    });
  }

  await tx.customer.update({
    where: { id: target.id },
    data: {
      stripeCustomerId: details.stripeCustomerId,
      name: details.name,
      ...(emailFree ? { email: details.email } : {}),
      ...(phoneFree ? { whatsapp: details.whatsapp } : {}),
    },
  });

  return target.id;
}
