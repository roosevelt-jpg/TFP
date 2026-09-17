import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolvePromotionCode } = vi.hoisted(() => ({
  resolvePromotionCode: vi.fn(),
}));

vi.mock("@/lib/payments/resolve-promo", () => ({
  resolvePromotionCode,
}));

const { resolveOffer, resolvePublicOffer } = await import(
  "@/lib/offers/resolve"
);

beforeEach(() => vi.clearAllMocks());

describe("resolveOffer", () => {
  it("returns standard £149 with no promo", async () => {
    await expect(resolveOffer(null)).resolves.toMatchObject({
      amountDueToday: 149,
      standardAmount: 149,
      renewalAmount: 79,
      promoState: "none",
      founderActive: false,
      amountDueTodayLabel: "£149",
    });
    expect(resolvePromotionCode).not.toHaveBeenCalled();
  });

  it("returns founder £74.50 when FORMULA50 is valid", async () => {
    resolvePromotionCode.mockResolvedValue({
      state: "valid",
      promotionCodeId: "promo_1",
    });

    await expect(resolveOffer("FORMULA50")).resolves.toMatchObject({
      amountDueToday: 74.5,
      promoState: "valid",
      founderActive: true,
      promotionCode: "FORMULA50",
      amountDueTodayLabel: "£74.50",
      renewalDisclosure: expect.stringContaining("£74.50"),
    });
  });

  it("falls back to £149 when the promo is invalid or exhausted", async () => {
    resolvePromotionCode.mockResolvedValue({ state: "invalid" });

    await expect(resolveOffer("FORMULA50")).resolves.toMatchObject({
      amountDueToday: 149,
      promoState: "invalid",
      founderActive: false,
    });
  });

  it("falls back to £149 when Stripe is unavailable (no silent discount)", async () => {
    resolvePromotionCode.mockResolvedValue({ state: "unavailable" });

    await expect(resolveOffer("FORMULA50")).resolves.toMatchObject({
      amountDueToday: 149,
      promoState: "unavailable",
      founderActive: false,
    });
  });

  it("ignores client-looking amounts and only trusts known founder code math", async () => {
    resolvePromotionCode.mockResolvedValue({
      state: "valid",
      promotionCodeId: "promo_other",
    });

    // Unknown-but-valid Stripe codes do not invent a half-price offer.
    await expect(resolveOffer("OTHER10")).resolves.toMatchObject({
      amountDueToday: 149,
      promoState: "valid",
      founderActive: false,
    });
  });
});

describe("resolvePublicOffer", () => {
  it("skips promo lookup when payments are not live", async () => {
    await expect(resolvePublicOffer(false)).resolves.toMatchObject({
      promoState: "none",
      amountDueToday: 149,
    });
    expect(resolvePromotionCode).not.toHaveBeenCalled();
  });

  it("tries FORMULA50 when payments are live", async () => {
    resolvePromotionCode.mockResolvedValue({
      state: "valid",
      promotionCodeId: "promo_1",
    });

    await expect(resolvePublicOffer(true)).resolves.toMatchObject({
      founderActive: true,
      amountDueToday: 74.5,
    });
    expect(resolvePromotionCode).toHaveBeenCalledWith("FORMULA50");
  });
});
