import { beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/clients/stripe", () => ({
  stripe: { checkout: { sessions: { create } } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { createCheckoutSessionForBuyer } = await import(
  "@/lib/payments/create-session"
);

const params = { mode: "subscription", customer: "cus_1" } as never;
const KEY = "key_1";

const idempotencyConflict = Object.assign(new Error("keys can only be used"), {
  type: "StripeIdempotencyError",
});

beforeEach(() => vi.clearAllMocks());

describe("createCheckoutSessionForBuyer", () => {
  it("sends the key so a double-clicked submit replays one session", async () => {
    create.mockResolvedValue({ id: "cs_1" });

    await createCheckoutSessionForBuyer({ params, idempotencyKey: KEY });

    expect(create).toHaveBeenCalledExactlyOnceWith(params, {
      idempotencyKey: KEY,
    });
  });

  // The buyer corrected a detail inside the hour the key lives for. Stripe
  // refuses to replay a key whose parameters changed, so without this they
  // could not pay until the window rolled over.
  describe("when the parameters changed inside the window", () => {
    beforeEach(() => {
      create
        .mockRejectedValueOnce(idempotencyConflict)
        .mockResolvedValueOnce({ id: "cs_2" });
    });

    it("retries unkeyed rather than failing the sale", async () => {
      const session = await createCheckoutSessionForBuyer({
        params,
        idempotencyKey: KEY,
      });

      expect(session).toEqual({ id: "cs_2" });
      expect(create).toHaveBeenCalledTimes(2);
      expect(create.mock.calls[1]?.[1]).toBeUndefined();
    });

    it("retries with the parameters the buyer actually submitted", async () => {
      await createCheckoutSessionForBuyer({ params, idempotencyKey: KEY });

      expect(create.mock.calls[1]?.[0]).toBe(params);
    });
  });

  // Only this one error is recoverable by retrying. A card error or an outage
  // must surface, not be silently attempted twice.
  describe("leaves every other failure alone", () => {
    const others: [string, Error][] = [
      [
        "a card error",
        Object.assign(new Error("declined"), { type: "StripeCardError" }),
      ],
      [
        "an API error",
        Object.assign(new Error("down"), { type: "StripeAPIError" }),
      ],
      ["a plain error", new Error("something else")],
    ];

    for (const [label, error] of others) {
      it(label, async () => {
        create.mockRejectedValue(error);

        await expect(
          createCheckoutSessionForBuyer({ params, idempotencyKey: KEY }),
        ).rejects.toThrow();

        expect(create).toHaveBeenCalledTimes(1);
      });
    }
  });

  // Retrying forever would turn a persistent fault into a stampede.
  it("retries only once", async () => {
    create.mockRejectedValue(idempotencyConflict);

    await expect(
      createCheckoutSessionForBuyer({ params, idempotencyKey: KEY }),
    ).rejects.toThrow();

    expect(create).toHaveBeenCalledTimes(2);
  });
});
