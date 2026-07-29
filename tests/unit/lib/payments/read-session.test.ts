import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { readSessionDetails } from "@/lib/payments/read-session";

function session(overrides: Record<string, unknown> = {}) {
  const base = {
    id: "cs_test_1",
    created: 1_785_000_000,
    customer: "cus_1",
    customer_email: "buyer@example.com",
    customer_details: { email: "buyer@example.com" },
    amount_total: 14900,
    currency: "gbp",
    total_details: { amount_discount: 0 },
    metadata: {
      name: "Kane Mousah",
      whatsapp: "+447700900000",
      consentText: "I confirm I am 16 or over",
      policyVersion: "2026-07-26",
    },
    subscription: null,
    ...overrides,
  };
  return base as unknown as Stripe.Checkout.Session;
}

describe("readSessionDetails", () => {
  it("flattens what fulfillment needs", () => {
    expect(readSessionDetails(session())).toMatchObject({
      sessionId: "cs_test_1",
      stripeCustomerId: "cus_1",
      email: "buyer@example.com",
      name: "Kane Mousah",
      whatsapp: "+447700900000",
      amountTotal: 14900,
      currency: "gbp",
    });
  });

  it("prefers customer_details.email over the requested one", () => {
    const details = readSessionDetails(
      session({
        customer_email: "typed@example.com",
        customer_details: { email: "corrected@example.com" },
      }),
    );

    expect(details?.email).toBe("corrected@example.com");
  });

  it("accepts an expanded customer object", () => {
    const details = readSessionDetails(
      session({ customer: { id: "cus_expanded", object: "customer" } }),
    );

    expect(details?.stripeCustomerId).toBe("cus_expanded");
  });

  // Null makes the caller throw, so the money lands as `failed` for redrive
  // rather than a half-written customer.
  describe("refuses to build a half-formed record", () => {
    const missing: [string, Record<string, unknown>][] = [
      ["no stripe customer", { customer: null }],
      ["no email", { customer_email: null, customer_details: { email: null } }],
      ["no name", { metadata: { whatsapp: "+447700900000" } }],
      ["no whatsapp", { metadata: { name: "Kane Mousah" } }],
      ["no metadata at all", { metadata: null }],
    ];

    for (const [label, override] of missing) {
      it(label, () => {
        expect(readSessionDetails(session(override))).toBeNull();
      });
    }
  });

  describe("promo codes", () => {
    it("reads an expanded promotion code", () => {
      const details = readSessionDetails(
        session({
          discounts: [{ promotion_code: { id: "promo_1", code: "FORMULA50" } }],
        }),
      );

      expect(details?.promoCode).toBe("FORMULA50");
    });

    it("falls back to the id when it isn't expanded", () => {
      const details = readSessionDetails(
        session({ discounts: [{ promotion_code: "promo_1" }] }),
      );

      expect(details?.promoCode).toBe("promo_1");
    });

    it("is null when no code was used", () => {
      expect(readSessionDetails(session())?.promoCode).toBeNull();
    });
  });

  it("carries the discount total for the receipt", () => {
    const details = readSessionDetails(
      session({ amount_total: 7450, total_details: { amount_discount: 7450 } }),
    );

    expect(details?.amountTotal).toBe(7450);
    expect(details?.discountTotal).toBe(7450);
  });

  it("links a waitlist buyer when the session carries the id", () => {
    const details = readSessionDetails(
      session({
        metadata: {
          name: "Kane Mousah",
          whatsapp: "+447700900000",
          waitlistId: "wl_1",
        },
      }),
    );

    expect(details?.waitlistId).toBe("wl_1");
    expect(readSessionDetails(session())?.waitlistId).toBeNull();
  });
});
