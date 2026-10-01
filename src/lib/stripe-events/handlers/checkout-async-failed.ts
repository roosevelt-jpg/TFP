import "server-only";

import type Stripe from "stripe";

import { db } from "@/db";
import { recordFunnelEvent } from "@/lib/funnel/records";
import { logger } from "@/lib/logger";
import { enqueueCheckoutRecovery } from "@/lib/payments/enqueue-checkout-recovery";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

function readEmail(session: Stripe.Checkout.Session): string | null {
  const fromCustomer = session.customer_details?.email;
  if (fromCustomer) return fromCustomer;
  if (session.customer_email) return session.customer_email;
  return null;
}

function readName(session: Stripe.Checkout.Session): string | null {
  return (
    session.customer_details?.name ??
    (typeof session.metadata?.name === "string" ? session.metadata.name : null)
  );
}

function readWhatsapp(session: Stripe.Checkout.Session): string | null {
  const phone = session.customer_details?.phone;
  if (phone) return phone;
  return typeof session.metadata?.whatsapp === "string"
    ? session.metadata.whatsapp
    : null;
}

/**
 * Delayed methods (Bacs and similar) can fail after Checkout already
 * completed. The buyer was not charged. Record it, alert staff, and send
 * them back to a fresh checkout.
 */
export async function handleCheckoutAsyncPaymentFailed(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = readEmail(session);
  const threadKey = `checkout-async-failed:${session.id}`;

  await recordFunnelEvent({
    eventName: "payment_failed",
    sessionId: session.id,
    waitlistId:
      typeof session.metadata?.waitlistId === "string"
        ? session.metadata.waitlistId
        : undefined,
    source: "stripe",
    properties: {
      email,
      paymentStatus: session.payment_status,
    },
    eventId: `payment_failed:checkout:${session.id}`,
  });

  const existing = await db.alert.findFirst({
    where: { threadKey, status: { in: ["open", "acknowledged"] } },
  });
  if (!existing) {
    await db.alert.create({
      data: {
        ruleId: "PY2",
        severity: "p1",
        title: `Checkout payment failed — ${email ?? session.id}`,
        payload: {
          sessionId: session.id,
          email,
          paymentStatus: session.payment_status,
        },
        threadKey,
      },
    });
  }

  if (email) {
    await db.staffTodo.create({
      data: {
        personKey: "leah",
        title: `Recover failed checkout: ${email}`,
        status: "open",
        dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        source: "system",
        createdBy: "stripe.checkout_async_failed",
      },
    });

    await enqueueCheckoutRecovery({
      sessionId: session.id,
      email,
      name: readName(session),
      whatsapp: readWhatsapp(session),
      promotionCode:
        typeof session.metadata?.promoCode === "string"
          ? session.metadata.promoCode
          : undefined,
    });
  }

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: `P1 PY2 · Checkout payment failed for ${email ?? session.id}. No charge taken. Recovery checkout queued.`,
    });
  }

  logger.warn("Checkout async payment failed", {
    sessionId: session.id,
    email,
    paymentStatus: session.payment_status,
  });
}
