"use server";

import { returnValidationErrors } from "next-safe-action";

import { AppError, ERROR_CODES } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { enqueueCoachingAnswers } from "@/lib/payments/enqueue-ghl";
import { saveCoachingProfile } from "@/lib/payments/persist-coaching";
import { resolvePaidPurchase } from "@/lib/payments/resolve-purchase";
import { actionClient } from "@/lib/safe-action";
import { cleanText } from "@/lib/sanitize/text";
import { coachingSchema } from "@/lib/validation/coaching/schema";
import { enqueueServiceRegisteredWhatsApp } from "@/lib/whatsapp/enqueue";
import { db } from "@/db";
import { firstNameOf } from "@/lib/name";

// The session id is the only credential: the customer is resolved from Stripe
// server-side, so nothing the client sends can point these answers at someone
// else's record. Same 24h box as the page that renders the form.
export const saveCoaching = actionClient
  .metadata({ actionName: "saveCoaching" })
  .inputSchema(coachingSchema)
  .action(async ({ parsedInput }) => {
    const purchase = await resolvePaidPurchase(parsedInput.sessionId);

    if (!purchase) {
      returnValidationErrors(coachingSchema, {
        sessionId: {
          _errors: ["We couldn’t match that to a purchase. Talk to the team."],
        },
      });
    }

    const { sessionId: _sessionId, injuries, ...answers } = parsedInput;

    try {
      await saveCoachingProfile(purchase.customerId, {
        ...answers,
        injuries: injuries ? cleanText(injuries, 300) : null,
      });
    } catch (error) {
      logger.error("Could not save coaching profile", error, {
        customerId: purchase.customerId,
      });
      throw new AppError(
        ERROR_CODES.UNKNOWN,
        "Couldn’t save your answers. Please try again.",
      );
    }

    logger.info("Coaching profile saved", {
      purchaseRef: purchase.ref,
      customerId: purchase.customerId,
    });

    // The answers are the reason the coach can start from something specific,
    // so they go to the CRM too. Swallowed on failure: the row is saved either
    // way and reconcile repairs the contact.
    await enqueueCoachingAnswers({
      purchaseRef: purchase.ref,
      customerId: purchase.customerId,
    });

    try {
      const customer = await db.customer.findUnique({
        where: { id: purchase.customerId },
        select: { whatsapp: true, name: true },
      });
      if (customer?.whatsapp) {
        await enqueueServiceRegisteredWhatsApp({
          toE164: customer.whatsapp,
          firstName: firstNameOf(customer.name) || customer.name,
          customerId: purchase.customerId,
          serviceKey: `coaching:${purchase.ref}`,
        });
      }
    } catch (error) {
      logger.warn("Could not enqueue service_registered WhatsApp", {
        purchaseRef: purchase.ref,
        message: error instanceof Error ? error.message : "failed",
      });
    }

    return { saved: true };
  });
