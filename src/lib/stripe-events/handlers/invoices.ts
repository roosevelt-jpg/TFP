import "server-only";

import type Stripe from "stripe";

import { recordFunnelEvent } from "@/lib/funnel/records";
import { logger } from "@/lib/logger";
import { syncStripeSubscriptionState } from "@/lib/payments/sync-subscription";
import { db } from "@/db";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

// dahlia removed invoice.subscription; the link moved under parent.
export function readSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  eventCreated: number,
): Promise<void> {
  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  const result = await syncStripeSubscriptionState(
    subscriptionId,
    eventCreated,
  );

  if (result.state === "synced" && result.from === "past_due") {
    logger.info("Membership recovered after dunning", {
      stripeSubscriptionId: subscriptionId,
      to: result.to,
    });
  }
}

/**
 * Mirror subscription state, record funnel event, alert Kane (PY2),
 * and open a staff recovery todo. Stripe still owns customer dunning emails.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  eventCreated: number,
): Promise<void> {
  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  await syncStripeSubscriptionState(subscriptionId, eventCreated);

  const sub = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    include: { customer: true },
  });

  await recordFunnelEvent({
    eventName: "payment_failed",
    customerId: sub?.customerId,
    source: "stripe",
    properties: {
      stripeSubscriptionId: subscriptionId,
      invoiceId: invoice.id,
      attemptCount: invoice.attempt_count,
      amountDue: invoice.amount_due,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      nextAttempt: invoice.next_payment_attempt,
    },
    eventId: `payment_failed:${invoice.id}:${invoice.attempt_count ?? 0}`,
  });

  const threadKey = `PY2-${subscriptionId}`;
  const existing = await db.alert.findFirst({
    where: { threadKey, status: { in: ["open", "acknowledged"] } },
  });
  if (!existing) {
    await db.alert.create({
      data: {
        ruleId: "PY2",
        severity: "p1",
        title: `Payment failed — ${sub?.customer.email ?? subscriptionId}`,
        payload: {
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          customerId: sub?.customerId,
        },
        threadKey,
      },
    });
  }

  if (sub?.customerId) {
    await db.staffTodo.create({
      data: {
        personKey: "leah",
        title: `Recover payment: ${sub.customer.email}`,
        status: "open",
        dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        source: "system",
        createdBy: "stripe.payment_failed",
      },
    });
  }

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: `P1 PY2 · Payment failed for ${sub?.customer.email ?? subscriptionId} · £${((invoice.amount_due ?? 0) / 100).toFixed(2)} · ${invoice.hosted_invoice_url ?? "no hosted URL"}`,
    });
  }

  logger.warn("Membership payment failed", {
    stripeSubscriptionId: subscriptionId,
    attemptCount: invoice.attempt_count,
    nextAttempt: invoice.next_payment_attempt,
    amountDue: invoice.amount_due,
  });
}

export async function handleInvoiceActionRequired(
  invoice: Stripe.Invoice,
  eventCreated: number,
): Promise<void> {
  const subscriptionId = readSubscriptionId(invoice);
  if (!subscriptionId) return;

  await syncStripeSubscriptionState(subscriptionId, eventCreated);

  logger.warn("Membership payment needs customer action", {
    stripeSubscriptionId: subscriptionId,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  });
}

export function handleInvoiceFinalizationFailed(invoice: Stripe.Invoice): void {
  logger.error("Invoice could not be finalized", undefined, {
    invoiceId: invoice.id,
    reason: invoice.last_finalization_error?.message ?? "unknown",
    code: invoice.last_finalization_error?.code ?? null,
  });
}
