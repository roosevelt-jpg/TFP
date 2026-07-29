import "server-only";

import { randomBytes } from "node:crypto";

import { stripe } from "@/lib/clients/stripe";
import { logger } from "@/lib/logger";
import { firstNameOf } from "@/lib/name";
import { generateRef } from "@/lib/waitlist/ref";
import { db } from "@/db";
import { PurchaseStatus } from "@/generated/prisma/client";

import { enqueueMembershipPurchase } from "./enqueue-ghl";
import { enqueueProgrammePdf } from "./enqueue-pdf";
import { upsertCustomer } from "./persist-customer";
import { upsertSubscription } from "./persist-subscription";
import { isGeneratedCodeCollision } from "./prisma-errors";
import { readSessionDetails, type SessionDetails } from "./read-session";

// Stripe's contract for this function (docs.stripe.com/checkout/fulfillment):
// safe to call multiple times, possibly concurrently, for the same session id.
// Called by the webhook and by /success — whichever arrives first does the work.
export type FulfillResult =
  | {
      state: "fulfilled";
      ref: string;
      firstName: string;
      customerId: string;
      // Session age, for callers that time-box what they render.
      createdAt: number;
      amountTotal: number;
      currency: string;
    }
  | { state: "unpaid" }
  | { state: "invalid" };

const MAX_ATTEMPTS = 5;

export async function fulfillCheckout(
  sessionId: string,
  eventCreated = 0,
): Promise<FulfillResult> {
  // discounts.promotion_code is the human code (FORMULA50); unexpanded it is
  // an opaque promo_… id nobody can trace back to a campaign.
  const session = await stripe.checkout.sessions
    .retrieve(sessionId, {
      expand: [
        "line_items",
        "subscription",
        "discounts.promotion_code",
        // dahlia removed charge.invoice, invoice.charge and
        // payment_intent.invoice, so the payment intent captured here is the
        // only thing a later refund can match the purchase on.
        "invoice.payments",
      ],
    })
    .catch((error: unknown) => {
      logger.warn("Could not retrieve session for fulfillment", {
        sessionId,
        reason: error instanceof Error ? error.message : "unknown",
      });
      return null;
    });

  if (session?.status !== "complete") return { state: "invalid" };

  // Delayed methods (Bacs) complete the session before the money lands;
  // async_payment_succeeded fulfils those later.
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return { state: "unpaid" };
  }

  const details = readSessionDetails(session);
  if (!details) {
    // Throws rather than returning invalid: the money is already taken, so this
    // must land as `failed` for redrive instead of being acked as handled.
    logger.error("Paid session is missing fulfillment details", undefined, {
      sessionId,
    });
    throw new Error(`Paid session ${sessionId} is missing fulfillment details`);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await writeFulfillment(details, eventCreated);
    } catch (error) {
      if (isGeneratedCodeCollision(error) && attempt < MAX_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Fulfillment kept conflicting for ${details.sessionId}`);
}

async function writeFulfillment(
  details: SessionDetails,
  eventCreated: number,
): Promise<FulfillResult> {
  const { customerId, ref } = await db.$transaction(async (tx) => {
    const customerId = await upsertCustomer(tx, details);

    const purchase = await tx.purchase.upsert({
      where: { stripeCheckoutSessionId: details.sessionId },
      create: {
        ref: generateRef("FP"),
        pdfToken: randomBytes(32).toString("base64url"),
        customerId,
        stripeCheckoutSessionId: details.sessionId,
        stripeInvoiceId: details.stripeInvoiceId,
        stripePaymentIntentId: details.stripePaymentIntentId,
        amountTotal: details.amountTotal,
        discountTotal: details.discountTotal,
        currency: details.currency,
        promoCode: details.promoCode,
        status: PurchaseStatus.paid,
        purchasedAt: new Date(),
      },
      // Only the money fields, and never the step ledger: a replay must not
      // reset welcomeEmailAt or the welcome email sends twice.
      update: {
        status: PurchaseStatus.paid,
        stripeInvoiceId: details.stripeInvoiceId,
        stripePaymentIntentId: details.stripePaymentIntentId,
        amountTotal: details.amountTotal,
        discountTotal: details.discountTotal,
        promoCode: details.promoCode,
      },
      select: { ref: true },
    });

    if (details.subscription) {
      await upsertSubscription(
        tx,
        customerId,
        details.subscription,
        eventCreated,
      );
    }

    return { customerId, ref: purchase.ref };
  });

  logger.info("Checkout fulfilled", {
    purchaseRef: ref,
    sessionId: details.sessionId,
    customerId,
  });

  // After the commit, never inside it: the transaction holds row locks and a
  // GHL round trip has no business being under them. The PDF task chains into
  // the welcome email, so this one enqueue covers both.
  await enqueueMembershipPurchase({ purchaseRef: ref, customerId });
  await enqueueProgrammePdf({ purchaseRef: ref, customerId });

  return {
    state: "fulfilled",
    ref,
    firstName: firstNameOf(details.name),
    customerId,
    createdAt: details.createdAt,
    amountTotal: details.amountTotal,
    currency: details.currency,
  };
}
