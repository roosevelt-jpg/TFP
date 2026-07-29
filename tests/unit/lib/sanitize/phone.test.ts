import { describe, expect, it } from "vitest";

import { toE164 } from "@/lib/sanitize/phone";
import { checkoutFormSchema } from "@/lib/validation/checkout/schema";

const FORM = {
  name: "Kane Mousah",
  email: "buyer@example.com",
  whatsapp: "+447738792922",
  consent: true,
  turnstileToken: "token",
};

describe("toE164", () => {
  it("converts a GB national mobile to E.164", () => {
    expect(toE164("07911 123456")).toBe("+447911123456");
  });

  it("passes an already-international number through", () => {
    expect(toE164("+447911123456")).toBe("+447911123456");
  });

  it("returns null for garbage instead of throwing", () => {
    expect(toE164("hello")).toBeNull();
    expect(toE164("")).toBeNull();
  });

  it("formats parseable non-mobiles too — the mobile-only gate is the schema's job", () => {
    expect(toE164("020 7946 0958")).toBe("+442079460958");
  });

  // Customer.whatsapp is unique, so a number stored in two shapes would let the
  // same person through twice.
  it("collapses every format of one number to a single string", () => {
    const variants = [
      "07738 792922",
      "07738792922",
      "+447738792922",
      "+44 7738 792922",
      "+44 (0) 7738 792922",
      "0044 7738 792922",
      "  07738792922  ",
      "07738-792-922",
    ];

    const normalised = new Set(variants.map((v) => toE164(v)));

    expect(normalised.size).toBe(1);
    expect([...normalised][0]).toBe("+447738792922");
  });

  it("keeps genuinely different numbers apart", () => {
    expect(toE164("07738792922")).not.toBe(toE164("07746392977"));
  });

  it("keeps an international number in its own country code", () => {
    expect(toE164("+353 87 123 4567")).toBe("+353871234567");
  });

  // Formatting without judging is deliberate, so the schema is what keeps a
  // too-short number out of the database.
  it("leaves validity to the schema", () => {
    expect(toE164("12")).toBe("+4412");
    expect(
      checkoutFormSchema.safeParse({ ...FORM, whatsapp: "12" }).success,
    ).toBe(false);
  });
});
