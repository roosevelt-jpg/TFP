import "server-only";

import { tasks } from "@trigger.dev/sdk";

import { logger } from "@/lib/logger";
import { db } from "@/db";
import { env } from "@/env";
import type { SubscriptionStatus } from "@/generated/prisma/enums";
import type { syncGhlMembership } from "@/trigger/sync-ghl-membership";

// Nothing in here may throw. It runs after the money is already recorded, so a
// Trigger outage or a slow read must not turn into a non-2xx on the webhook —
// Stripe would then delay finalizing invoices for up to 72 hours. The nightly
// reconcile repairs anything dropped.
async function neverThrows(
  what: string,
  work: () => Promise<void>,
): Promise<void> {
  // Nothing is queued while the sync is off, so a half-configured GHL cannot
  // fill the dashboard with runs that abort on placeholder field ids.
  if (!env.GHL_SYNC_ENABLED) return;

  try {
    await work();
  } catch (error) {
    logger.error("Could not enqueue the GHL membership sync", error, { what });
  }
}

async function enqueue(
  payload: Parameters<typeof syncGhlMembership.trigger>[0],
  idempotencyKey: string,
): Promise<void> {
  await tasks.trigger<typeof syncGhlMembership>(
    "sync-ghl-membership",
    payload,
    {
      idempotencyKey,
      idempotencyKeyTTL: "30d",
      // One contact at a time. Three events for the same buyer can land
      // together, and interleaved tag writes could leave a paying member
      // locked out by a stale overdue.
      queue: "ghl",
      concurrencyKey: payload.email,
    },
  );
}

export async function enqueueMembershipPurchase(input: {
  purchaseRef: string;
  customerId: string;
}): Promise<void> {
  await neverThrows("purchase", async () => {
    const customer = await db.customer.findUnique({
      where: { id: input.customerId },
      select: {
        name: true,
        email: true,
        whatsapp: true,
        stripeCustomerId: true,
        consentAt: true,
        coaching: true,
      },
    });

    if (!customer) return;

    const purchase = await db.purchase.findUnique({
      where: { ref: input.purchaseRef },
      select: { purchasedAt: true },
    });

    await enqueue(
      {
        kind: "purchase",
        purchaseRef: input.purchaseRef,
        name: customer.name,
        email: customer.email,
        phone: customer.whatsapp,
        stripeCustomerId: customer.stripeCustomerId,
        purchasedAt: purchase?.purchasedAt ?? new Date(),
        consentAt: customer.consentAt,
        coaching: customer.coaching,
      },
      // Keyed on the purchase so a replayed webhook cannot re-run the sync.
      `ghl-purchase:${input.purchaseRef}`,
    );
  });
}

// Re-runs the purchase sync now the coaching answers exist. Same shape, so the
// upsert simply adds the nine fields to a contact it already created; only the
// key differs, or the purchase enqueue would swallow this as a duplicate.
export async function enqueueCoachingAnswers(input: {
  purchaseRef: string;
  customerId: string;
}): Promise<void> {
  await neverThrows("coaching", async () => {
    const customer = await db.customer.findUnique({
      where: { id: input.customerId },
      select: {
        name: true,
        email: true,
        whatsapp: true,
        stripeCustomerId: true,
        consentAt: true,
        coaching: true,
      },
    });

    if (!customer?.coaching) return;

    const purchase = await db.purchase.findUnique({
      where: { ref: input.purchaseRef },
      select: { purchasedAt: true },
    });

    await enqueue(
      {
        kind: "purchase",
        purchaseRef: input.purchaseRef,
        name: customer.name,
        email: customer.email,
        phone: customer.whatsapp,
        stripeCustomerId: customer.stripeCustomerId,
        purchasedAt: purchase?.purchasedAt ?? new Date(),
        consentAt: customer.consentAt,
        coaching: customer.coaching,
      },
      // Keyed on when they were answered, so a later edit syncs again.
      `ghl-coaching:${input.purchaseRef}:${customer.coaching.completedAt?.getTime() ?? 0}`,
    );
  });
}

export async function enqueueMembershipState(input: {
  customerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  eventId: string;
}): Promise<void> {
  await neverThrows("lifecycle", async () => {
    const customer = await db.customer.findUnique({
      where: { id: input.customerId },
      select: { name: true, email: true, whatsapp: true },
    });

    if (!customer) return;

    await enqueue(
      {
        kind: "lifecycle",
        name: customer.name,
        email: customer.email,
        phone: customer.whatsapp,
        status: input.status,
        stripeSubscriptionId: input.stripeSubscriptionId,
      },
      // Keyed on the event, not the subscription: each transition must sync, but
      // a redelivery of the same one must not.
      `ghl-state:${input.eventId}`,
    );
  });
}
