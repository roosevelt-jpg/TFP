import { describe, expect, it } from "vitest";

import { buildCheckoutSessionParams } from "@/lib/payments/checkout";
import { TRIAL_DAYS } from "@/lib/pricing";

const base = {
  programmePriceId: "price_programme",
  membershipPriceId: "price_membership",
  name: "Kane Mousah",
  whatsapp: "+447700900000",
  consentText: "I confirm I am 16 or over…",
  policyVersion: "2026-07-26",
  eventId: "evt_dedup_123",
  appUrl: "https://example.com",
  stripeCustomerId: "cus_prefilled",
};

describe("buildCheckoutSessionParams", () => {
  it("uses subscription mode with both line items", () => {
    const params = buildCheckoutSessionParams(base);

    expect(params.mode).toBe("subscription");
    expect(params.line_items).toHaveLength(2);
    expect(params.line_items?.map((item) => item.price)).toEqual([
      "price_membership",
      "price_programme",
    ]);
  });

  // The whole payment model in one assertion: the trial is what stops the £79
  // being charged today alongside the £149.
  it("defers the membership by the full programme length", () => {
    const params = buildCheckoutSessionParams(base);

    expect(params.subscription_data?.trial_period_days).toBe(TRIAL_DAYS);
    expect(params.subscription_data?.trial_period_days).toBe(56);
  });

  // Stripe treats these as mutually exclusive, so which one we send has to
  // follow whether the buyer already gave us a code.
  describe("promotion codes", () => {
    it("offers Stripe's own field when no code was entered", () => {
      const params = buildCheckoutSessionParams(base);

      expect(params.allow_promotion_codes).toBe(true);
      expect(params.discounts).toBeUndefined();
    });

    // Applied for them, because Stripe's field is a collapsed link buyers miss.
    it("applies a resolved code and drops the field", () => {
      const params = buildCheckoutSessionParams({
        ...base,
        promotionCodeId: "promo_123",
      });

      expect(params.discounts).toEqual([{ promotion_code: "promo_123" }]);
      expect(params.allow_promotion_codes).toBeUndefined();
    });

    // Sending both is a Stripe API error, so the buyer would see a generic
    // failure instead of a checkout page.
    it("never sends both", () => {
      for (const promotionCodeId of [undefined, "promo_123"]) {
        const params = buildCheckoutSessionParams({ ...base, promotionCodeId });

        expect(
          Boolean(params.discounts) && Boolean(params.allow_promotion_codes),
        ).toBe(false);
      }
    });

    // The id, not the string the buyer typed: `discounts` takes a promo_ id,
    // and passing the raw code fails.
    it("sends the resolved id rather than the typed code", () => {
      const params = buildCheckoutSessionParams({
        ...base,
        promotionCodeId: "promo_abc",
      });

      expect(params.discounts?.[0]).toEqual({ promotion_code: "promo_abc" });
    });
  });

  // Dynamic payment methods: hardcoding this list is the documented trap.
  it("never pins payment_method_types", () => {
    expect(
      buildCheckoutSessionParams(base).payment_method_types,
    ).toBeUndefined();
  });

  describe("metadata", () => {
    // Nothing is written to our database before payment, so everything the
    // webhook needs to create the Customer has to survive the round trip.
    it("carries everything fulfillment needs", () => {
      const params = buildCheckoutSessionParams(base);

      expect(params.metadata).toMatchObject({
        name: "Kane Mousah",
        whatsapp: "+447700900000",
        consentText: "I confirm I am 16 or over…",
        policyVersion: "2026-07-26",
        eventId: "evt_dedup_123",
      });
    });

    // Lifecycle events arrive with a subscription, not a session, so the same
    // details have to hang off both or renewals can't resolve the customer.
    it("mirrors metadata onto the subscription", () => {
      const params = buildCheckoutSessionParams(base);

      expect(params.subscription_data?.metadata).toMatchObject({
        name: "Kane Mousah",
        whatsapp: "+447700900000",
      });
    });

    // 500 chars per value, 50 keys. Our longest field is a 120-char email and
    // the coaching answers are collected after payment precisely so they never
    // have to fit here.
    it("stays inside Stripe's metadata limits", () => {
      const params = buildCheckoutSessionParams({
        ...base,
        name: "N".repeat(80),
        whatsapp: "+4477009000001234",
        consentText: "C".repeat(400),
      });
      const metadata = params.metadata ?? {};

      expect(Object.keys(metadata).length).toBeLessThanOrEqual(50);
      for (const value of Object.values(metadata)) {
        expect(String(value).length).toBeLessThanOrEqual(500);
      }
    });
  });

  it("puts the session id placeholder on the success url", () => {
    const params = buildCheckoutSessionParams(base);

    expect(params.success_url).toBe(
      "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(params.cancel_url).toBe("https://example.com/checkout-cancelled");
  });

  describe("waitlist linkage", () => {
    it("omits waitlist fields for an organic buyer", () => {
      const params = buildCheckoutSessionParams(base);

      expect(params.client_reference_id).toBeUndefined();
      expect(params.metadata).not.toHaveProperty("waitlistId");
    });

    it("carries them when the buyer came from a launch link", () => {
      const params = buildCheckoutSessionParams({
        ...base,
        waitlistRef: "WL-ABC123",
        waitlistId: "wl_1",
      });

      expect(params.client_reference_id).toBe("WL-ABC123");
      expect(params.metadata).toMatchObject({ waitlistId: "wl_1" });
    });
  });

  describe("phone collection", () => {
    // Required by the GHL automation, which matches the contact by number.
    it("collects a phone number at Stripe", () => {
      expect(buildCheckoutSessionParams(base).phone_number_collection).toEqual({
        enabled: true,
      });
    });

    // Stripe prefills the phone field only from a Customer that already has
    // one, and it rejects `customer` alongside `customer_email`. Passing the
    // email instead would leave the buyer retyping a number that then
    // disagrees with the WhatsApp they gave us.
    it("always identifies the buyer by Customer, never by email", () => {
      const params = buildCheckoutSessionParams(base);

      expect(params.customer).toBe("cus_prefilled");
      expect(params.customer_email).toBeUndefined();
    });
  });

  it("tags the session with an integration identifier", () => {
    expect(buildCheckoutSessionParams(base).integration_identifier).toMatch(
      /^formula_checkout_[a-z]{8}$/,
    );
  });
});
