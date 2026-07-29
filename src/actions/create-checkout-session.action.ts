"use server";

import { returnValidationErrors } from "next-safe-action";

import { findCustomerByContact } from "@/data/payments/queries/find-customer-by-contact";
import { findWaitlistByToken } from "@/data/payments/queries/find-waitlist-by-token";
import { clientIp } from "@/lib/client-ip";
import { AppError, ERROR_CODES } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { buildCheckoutSessionParams } from "@/lib/payments/checkout";
import {
  CHECKOUT_CONSENT_TEXT,
  CHECKOUT_POLICY_VERSION,
} from "@/lib/payments/consent";
import { createCheckoutSessionForBuyer } from "@/lib/payments/create-session";
import {
  checkoutEventId,
  checkoutIdempotencyKey,
} from "@/lib/payments/idempotency";
import { resolveProgrammePrices } from "@/lib/payments/resolve-prices";
import { resolvePromotionCode } from "@/lib/payments/resolve-promo";
import { ensureStripeCustomer } from "@/lib/payments/stripe-customer";
import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanText } from "@/lib/sanitize/text";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkoutSchema } from "@/lib/validation/checkout/schema";
import { env } from "@/env";

export const createCheckoutSession = actionClient
  .metadata({ actionName: "createCheckoutSession" })
  .inputSchema(checkoutSchema)
  .action(async ({ parsedInput }) => {
    const ip = await clientIp();

    if (!(await verifyTurnstile(parsedInput.turnstileToken, ip, "checkout"))) {
      returnValidationErrors(checkoutSchema, {
        turnstileToken: { _errors: ["Verification failed. Please try again."] },
      });
    }

    const whatsapp = toE164(parsedInput.whatsapp);

    if (!whatsapp) {
      returnValidationErrors(checkoutSchema, {
        whatsapp: { _errors: ["Enter a valid mobile number"] },
      });
    }

    const email = cleanEmail(parsedInput.email);
    const name = cleanText(parsedInput.name, 80);

    const existing = await findCustomerByContact(email, whatsapp);

    if (existing?.hasLiveSubscription) {
      logger.info("Blocked repeat purchase on a live membership", {
        customerId: existing.id,
        matchedOn: existing.email === email ? "email" : "whatsapp",
      });
      throw new AppError(
        ERROR_CODES.ALREADY_A_MEMBER,
        existing.email === email
          ? "You’re already a member on this email, so there’s nothing more to pay. Talk to the team if you need help getting back in."
          : "That number is already on an active membership, so there’s nothing more to pay. Talk to the team if you need help getting back in.",
      );
    }

    // Checked before the customer or session is created, so a bad code costs
    // nothing and reports against the field the buyer can actually fix.
    const promo = parsedInput.promoCode
      ? await resolvePromotionCode(parsedInput.promoCode)
      : null;

    if (promo?.state === "invalid") {
      returnValidationErrors(checkoutSchema, {
        promoCode: {
          _errors: ["That code isn’t valid. Leave it blank to continue."],
        },
      });
    }

    const prices = await resolveProgrammePrices();

    const waitlist = parsedInput.waitlistToken
      ? await findWaitlistByToken(parsedInput.waitlistToken)
      : null;

    // Created here, not by Checkout: Stripe only prefills the phone field from
    // a Customer that already has one, and that prefill is what stops the
    // number diverging from the WhatsApp they just gave us.
    const stripeCustomerId = await ensureStripeCustomer({
      existingId: existing?.stripeCustomerId,
      name,
      email,
      whatsapp,
    });

    // Keyed on the buyer, not on a fresh uuid: a double-clicked submit replays
    // the first session instead of opening a second.
    const session = await createCheckoutSessionForBuyer({
      params: buildCheckoutSessionParams({
        programmePriceId: prices.programmePriceId,
        membershipPriceId: prices.membershipPriceId,
        name,
        whatsapp,
        consentText: CHECKOUT_CONSENT_TEXT,
        policyVersion: CHECKOUT_POLICY_VERSION,
        eventId: checkoutEventId(stripeCustomerId),
        appUrl: env.NEXT_PUBLIC_APP_URL,
        waitlistRef: waitlist?.ref,
        waitlistId: waitlist?.id,
        stripeCustomerId,
        // unavailable falls through without one: Stripe still shows its own
        // field, so a lookup outage delays the discount rather than the sale.
        promotionCodeId:
          promo?.state === "valid" ? promo.promotionCodeId : undefined,
      }),
      idempotencyKey: checkoutIdempotencyKey(stripeCustomerId),
    });

    if (!session.url) {
      logger.error("Stripe returned a session with no URL", undefined, {
        sessionId: session.id,
      });

      throw new AppError(
        ERROR_CODES.UNKNOWN,
        "Couldn’t start checkout. Please try again.",
      );
    }

    logger.info("Checkout session created", {
      sessionId: session.id,
      waitlistLinked: Boolean(waitlist),
    });

    return { url: session.url };
  });
