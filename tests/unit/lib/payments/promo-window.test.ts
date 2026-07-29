import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { list, create, update } = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/clients/stripe", () => ({
  stripe: { promotionCodes: { list, create, update } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { openPromoWindow, PROMO_WINDOW_HOURS } = await import(
  "@/lib/payments/promo-window"
);

const NOW = new Date("2026-07-29T12:00:00Z");
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  create.mockResolvedValue({ id: "promo_new" });
  update.mockResolvedValue({});
});

afterEach(() => vi.useRealTimers());

describe("openPromoWindow", () => {
  it("dates the code 24 hours out", async () => {
    list.mockResolvedValue({ data: [] });

    const expiresAt = await openPromoWindow();

    expect(expiresAt).toEqual(new Date(NOW.getTime() + 24 * HOUR));
    expect(create.mock.calls[0]?.[0].expires_at).toBe(
      Math.floor((NOW.getTime() + PROMO_WINDOW_HOURS * HOUR) / 1000),
    );
  });

  it("keeps the code, the coupon and the redemption cap", async () => {
    list.mockResolvedValue({ data: [] });

    await openPromoWindow();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      code: "FORMULA50",
      promotion: { type: "coupon", coupon: "formula_programme_50" },
      max_redemptions: 50,
    });
  });

  // Stripe refuses a second active code with the same string, so the old one
  // has to go first or the create fails outright.
  it("deactivates the undated code before replacing it", async () => {
    list.mockResolvedValue({
      data: [{ id: "promo_old", expires_at: null, times_redeemed: 0 }],
    });

    await openPromoWindow();

    expect(update).toHaveBeenCalledWith("promo_old", { active: false });
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0],
    );
  });

  // The blast is re-runnable after a partial failure. Minting a second window
  // would hand the stragglers 24 hours the first recipients never got, and
  // reset the redemption count on an offer people had already used.
  describe("on a re-run", () => {
    const alreadyDated = {
      id: "promo_dated",
      expires_at: Math.floor((NOW.getTime() + 6 * HOUR) / 1000),
      times_redeemed: 4,
    };

    beforeEach(() => list.mockResolvedValue({ data: [alreadyDated] }));

    it("reuses the deadline the first recipients were given", async () => {
      const expiresAt = await openPromoWindow();

      expect(expiresAt).toEqual(new Date(NOW.getTime() + 6 * HOUR));
    });

    it("creates nothing and deactivates nothing", async () => {
      await openPromoWindow();

      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });
  });

  // The caller aborts the blast on null, so nobody is promised a deadline that
  // was never set.
  it("reports failure when the coupon is missing", async () => {
    list.mockResolvedValue({ data: [] });
    create.mockRejectedValue(new Error("no such coupon"));

    await expect(openPromoWindow()).rejects.toThrow();
  });
});
