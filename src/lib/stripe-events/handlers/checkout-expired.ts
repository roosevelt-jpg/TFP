import "server-only";

import type Stripe from "stripe";

import { recordFunnelEvent } from "@/lib/funnel/records";
import { logger } from "@/lib/logger";
import { enqueueCheckoutRecovery } from "@/lib/payments/enqueue-checkout-recovery";

function readEmail(session: Stripe.Checkout.Session): string | null {
  const fromCustomer = session.customer_details?.email;
  if (fromCustomer) return fromCustomer;
  if (session.customer_email) return session.customer_email;
  return null;
}

function readName(session: Stripe.Checkout.Session): string | null {
  return (
    session.customer_details?.name ??
    (typeof session.metadata?.name === "string"
      ? session.metadata.name
      : null)
  );
}

function readWhatsapp(session: Stripe.Checkout.Session): string | null {
  const phone = session.customer_details?.phone;
  if (phone) return phone;
  return typeof session.metadata?.whatsapp === "string"
    ? session.metadata.whatsapp
    : null;
}

export async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = readEmail(session);
  if (!email) {
    logger.info("Expired checkout had no email; recovery skipped", {
      sessionId: session.id,
    });
    return;
  }

  logger.info("Checkout session expired; enqueueing recovery", {
    sessionId: session.id,
    email,
  });

  await recordFunnelEvent({
    eventName: "checkout_abandoned",
    sessionId: session.id,
    waitlistId:
      typeof session.metadata?.waitlistId === "string"
        ? session.metadata.waitlistId
        : undefined,
    source: "stripe",
    properties: { email },
    eventId: `checkout_abandoned:${session.id}`,
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
