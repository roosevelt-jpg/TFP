import "server-only";

import { tasks } from "@trigger.dev/sdk";

import { logger } from "@/lib/logger";
import { db } from "@/db";
import type { watermarkPurchasePdf } from "@/trigger/watermark-pdf";

// Never throws: this runs after the money is recorded, and a Trigger outage
// must not become a non-2xx that makes Stripe delay finalizing invoices.
// Redrive replays the checkout event, which enqueues this again.
export async function enqueueProgrammePdf(input: {
  purchaseRef: string;
  customerId: string;
}): Promise<void> {
  try {
    const customer = await db.customer.findUnique({
      where: { id: input.customerId },
      select: { name: true, email: true },
    });

    if (!customer) return;

    await tasks.trigger<typeof watermarkPurchasePdf>(
      "watermark-pdf",
      {
        purchaseRef: input.purchaseRef,
        name: customer.name,
        email: customer.email,
      },
      {
        idempotencyKey: `pdf:${input.purchaseRef}`,
        idempotencyKeyTTL: "30d",
      },
    );
  } catch (error) {
    logger.error("Could not enqueue the programme PDF", error, {
      purchaseRef: input.purchaseRef,
    });
  }
}
