"use server";

import { returnValidationErrors } from "next-safe-action";
import * as z from "zod";

import { AppError, ERROR_CODES } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { createPortalSession } from "@/lib/payments/portal";
import { resolvePaidPurchase } from "@/lib/payments/resolve-purchase";
import { actionClient } from "@/lib/safe-action";

const portalSchema = z.object({ sessionId: z.string().trim().min(1) });

// Authorised by the checkout session id alone, resolved server side. Nothing the
// client sends can open someone else's billing, and the same 24h window that
// gates the success page gates this. After that, the emailed login link is the
// way in.
export const openBillingPortal = actionClient
  .metadata({ actionName: "openBillingPortal" })
  .inputSchema(portalSchema)
  .action(async ({ parsedInput }) => {
    const purchase = await resolvePaidPurchase(parsedInput.sessionId);

    if (!purchase) {
      returnValidationErrors(portalSchema, {
        sessionId: {
          _errors: ["We couldn’t match that to a purchase. Talk to the team."],
        },
      });
    }

    const url = await createPortalSession(
      purchase.stripeCustomerId,
      `/success?session_id=${parsedInput.sessionId}`,
    );

    if (!url) {
      logger.error("Could not create a billing portal session", undefined, {
        purchaseRef: purchase.ref,
      });
      throw new AppError(
        ERROR_CODES.UNKNOWN,
        "Couldn’t open billing right now. Please try again.",
      );
    }

    return { url };
  });
