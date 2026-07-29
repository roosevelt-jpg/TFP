import { beforeEach, describe, expect, it, vi } from "vitest";

const { list } = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("@/lib/clients/stripe", () => ({
  stripe: { promotionCodes: { list } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { resolvePromotionCode } = await import("@/lib/payments/resolve-promo");

const promo = (overrides: Record<string, unknown> = {}) => ({
  id: "promo_123",
  promotion: { type: "coupon", coupon: { id: "c_1", valid: true } },
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("resolvePromotionCode", () => {
  it("returns the id Stripe expects in discounts", async () => {
    list.mockResolvedValue({ data: [promo()] });

    await expect(resolvePromotionCode("FORMULA50")).resolves.toEqual({
      state: "valid",
      promotionCodeId: "promo_123",
    });
  });

  // Stripe flips a code inactive on expiry and on max_redemptions, so this
  // filter is what enforces the 24-hour window and the 50-place cap.
  it("only ever asks Stripe for active codes", async () => {
    list.mockResolvedValue({ data: [promo()] });

    await resolvePromotionCode("FORMULA50");

    expect(list).toHaveBeenCalledWith({
      code: "FORMULA50",
      active: true,
      limit: 1,
    });
  });

  it("trims what the buyer typed", async () => {
    list.mockResolvedValue({ data: [promo()] });

    await resolvePromotionCode("  FORMULA50  ");

    expect(list.mock.calls[0]?.[0].code).toBe("FORMULA50");
  });

  describe("rejects", () => {
    it("a code Stripe does not recognise", async () => {
      list.mockResolvedValue({ data: [] });

      await expect(resolvePromotionCode("NOPE")).resolves.toEqual({
        state: "invalid",
      });
    });

    it("an empty string without calling Stripe", async () => {
      await expect(resolvePromotionCode("   ")).resolves.toEqual({
        state: "invalid",
      });
      expect(list).not.toHaveBeenCalled();
    });

    // active covers expiry and redemption limits, but the parent coupon can be
    // deleted separately, leaving the code active and worthless.
    it("an active code whose coupon has been deleted", async () => {
      list.mockResolvedValue({
        data: [
          promo({ promotion: { type: "coupon", coupon: { valid: false } } }),
        ],
      });

      await expect(resolvePromotionCode("STALE")).resolves.toEqual({
        state: "invalid",
      });
    });
  });

  // An outage must not reject a genuine code: the caller falls back to Stripe's
  // own field so the buyer can still enter it there.
  describe("when Stripe cannot answer", () => {
    it("reports unavailable rather than invalid", async () => {
      list.mockRejectedValue(new Error("stripe is down"));

      await expect(resolvePromotionCode("FORMULA50")).resolves.toEqual({
        state: "unavailable",
      });
    });

    it("never throws into the checkout path", async () => {
      list.mockRejectedValue(new Error("stripe is down"));

      await expect(resolvePromotionCode("FORMULA50")).resolves.toBeDefined();
    });
  });

  // Telling a stranger which of expired, exhausted or wrong applies turns the
  // field into an oracle for guessing codes.
  it("gives one answer for every kind of bad code", async () => {
    list.mockResolvedValue({ data: [] });
    const unknown = await resolvePromotionCode("WRONG");

    list.mockResolvedValue({
      data: [
        promo({ promotion: { type: "coupon", coupon: { valid: false } } }),
      ],
    });
    const dead = await resolvePromotionCode("EXPIRED");

    expect(unknown).toEqual(dead);
  });
});
