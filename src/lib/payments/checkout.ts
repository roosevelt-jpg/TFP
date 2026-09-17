import type Stripe from "stripe";

import { TRIAL_DAYS } from "@/lib/pricing";

type BuildParams = {
  programmePriceId: string;
  membershipPriceId: string;
  name: string;
  whatsapp: string;
  consentText: string;
  policyVersion: string;
  eventId: string;
  appUrl: string;
  waitlistRef?: string;
  waitlistId?: string;
  // Created before the session so Stripe can prefill name, email and phone.
  stripeCustomerId: string;
  // Resolved from a code the buyer typed on our page. Stripe's own field is a
  // collapsed link that buyers miss, so when we have one we apply it for them.
  promotionCodeId?: string;
  /** Human-readable code (e.g. FORMULA50) for recovery messaging. */
  promotionCode?: string;
};

// Random suffix required by the dahlia integration_identifier convention.
const INTEGRATION_IDENTIFIER = "formula_checkout_qkzwnbxr";

// Pure: no I/O, so the shape of what we ask Stripe for is unit-testable without
// touching the network.
//
// Everything fulfillment needs travels in metadata, so nothing is written to our
// database until payment lands. Metadata allows 50 keys at 500 chars each, and
// the coaching questions are asked after payment precisely so they never have
// to fit.
export function buildCheckoutSessionParams({
  programmePriceId,
  membershipPriceId,
  name,
  whatsapp,
  consentText,
  policyVersion,
  eventId,
  appUrl,
  waitlistRef,
  waitlistId,
  stripeCustomerId,
  promotionCodeId,
  promotionCode,
}: BuildParams): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    name,
    whatsapp,
    consentText,
    policyVersion,
    // Shared with the client-side pixel so Meta can dedup the Purchase.
    eventId,
    ...(waitlistId ? { waitlistId } : {}),
    ...(promotionCode ? { promoCode: promotionCode } : {}),
  };

  return {
    mode: "subscription",
    // Membership first so Checkout labels the session as a subscription, with
    // the one-time programme fee alongside it. The trial defers the membership,
    // so only the £149 is due today.
    line_items: [
      { price: membershipPriceId, quantity: 1 },
      { price: programmePriceId, quantity: 1 },
    ],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata,
    },
    // Mutually exclusive, so this is a switch rather than two settings:
    //   with a code   apply it, and Stripe hides its own field (nothing left
    //                 to enter, and the discount is visible before they pay)
    //   without one   show Stripe's field, so a code can still be entered
    ...(promotionCodeId
      ? { discounts: [{ promotion_code: promotionCodeId }] }
      : { allow_promotion_codes: true }),
    // Always a Customer, never customer_email: Stripe only prefills the phone
    // field from a Customer with `phone` set, and a buyer retyping their number
    // here would disagree with the WhatsApp one they already gave us.
    customer: stripeCustomerId,
    // Required by the GHL side, which matches the contact by number.
    phone_number_collection: { enabled: true },
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout-cancelled`,
    metadata,
    ...(waitlistRef ? { client_reference_id: waitlistRef } : {}),
    integration_identifier: INTEGRATION_IDENTIFIER,
  };
}
