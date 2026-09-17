import "server-only";

import { getStripe } from "@/lib/clients/stripe";

import { customerIdempotencyKey } from "./idempotency";

// Created before checkout rather than letting Checkout mint one, because
// prefilling the phone field is only possible via a Customer with `phone` set.
// Without it the buyer retypes a number that then disagrees with the WhatsApp
// one they gave us, and GHL matches the contact on Stripe's copy.
export async function ensureStripeCustomer({
  existingId,
  name,
  email,
  whatsapp,
}: {
  existingId?: string;
  name: string;
  email: string;
  whatsapp: string;
}): Promise<string> {
  const stripe = await getStripe();
  if (existingId) {
    // Falls through to create if the stored id has been deleted in Stripe:
    // a stale reference must never be the reason someone can't pay.
    const updated = await stripe.customers
      .update(existingId, { name, email, phone: whatsapp })
      .catch(() => null);
    if (updated) return updated.id;
  }

  const created = await stripe.customers.create(
    { name, email, phone: whatsapp },
    { idempotencyKey: customerIdempotencyKey(email, whatsapp) },
  );
  return created.id;
}
