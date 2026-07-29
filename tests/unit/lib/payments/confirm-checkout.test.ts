import { beforeEach, describe, expect, it, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    retrieve: vi.fn(),
    transaction: vi.fn(),
    findFulfilledSession: vi.fn(),
  },
}));

vi.mock("@/lib/clients/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve: mocks.retrieve } } },
}));

vi.mock("@/db", () => ({
  db: { $transaction: mocks.transaction },
}));

vi.mock("@/data/payments/queries/find-fulfilled-session", () => ({
  findFulfilledSession: mocks.findFulfilledSession,
}));

// The GHL enqueue runs after the money is recorded and swallows its own
// errors, so it is stubbed rather than exercised here.
vi.mock("@/lib/payments/enqueue-ghl", () => ({
  enqueueMembershipPurchase: vi.fn(),
  enqueueMembershipState: vi.fn(),
  enqueueCoachingAnswers: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { confirmCheckout } = await import("@/lib/payments/confirm-checkout");

const nowSeconds = () => Math.floor(Date.now() / 1000);

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_1",
    status: "complete",
    payment_status: "paid",
    created: nowSeconds(),
    customer: "cus_test_1",
    customer_email: "buyer@example.com",
    customer_details: { email: "buyer@example.com" },
    amount_total: 14900,
    currency: "gbp",
    total_details: { amount_discount: 0 },
    metadata: {
      name: "Kane Mousah",
      whatsapp: "+447700900000",
      consentText: "I confirm I am 16 or over…",
      policyVersion: "2026-07-26",
    },
    ...overrides,
  };
}

// The transaction body writes through a client we don't exercise here; these
// tests are about which branch fulfillment takes, not Prisma's behaviour.
function stubTransaction() {
  mocks.transaction.mockImplementation(async () => ({
    customerId: "cust_1",
    ref: "FP-ABC12345",
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  stubTransaction();
  // No prior fulfillment by default, so these exercise the full Stripe path.
  mocks.findFulfilledSession.mockResolvedValue(null);
});

describe("confirmCheckout", () => {
  // Reloads are common on this page, and re-running fulfillment costs a Stripe
  // round trip plus a transaction each time.
  describe("already fulfilled", () => {
    const settled = {
      ref: "FP-SETTLED1",
      customerId: "cust_settled",
      name: "Kane Mousah",
      purchasedAt: new Date(),
      amountTotal: 14900,
      currency: "gbp",
    };

    it("serves from our own row without calling Stripe", async () => {
      mocks.findFulfilledSession.mockResolvedValue(settled);

      await expect(confirmCheckout("cs_test_1")).resolves.toMatchObject({
        state: "paid",
        ref: "FP-SETTLED1",
        firstName: "Kane",
        customerId: "cust_settled",
      });
      expect(mocks.retrieve).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    // The short circuit must not become a way around the time box.
    it("still boxes an old purchase", async () => {
      mocks.findFulfilledSession.mockResolvedValue({
        ...settled,
        purchasedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      await expect(confirmCheckout("cs_test_1")).resolves.toEqual({
        state: "invalid",
      });
    });
  });

  it("fulfils a completed, paid session and returns its reference", async () => {
    mocks.retrieve.mockResolvedValue(session());

    await expect(confirmCheckout("cs_test_1")).resolves.toMatchObject({
      state: "paid",
      ref: "FP-ABC12345",
      firstName: "Kane",
      customerId: "cust_1",
    });
  });

  it("expands line_items and subscription, per Stripe's fulfillment contract", async () => {
    mocks.retrieve.mockResolvedValue(session());

    await confirmCheckout("cs_test_1");

    // discounts.promotion_code is what turns an opaque promo_… id into
    // FORMULA50 on the purchase record.
    expect(mocks.retrieve).toHaveBeenCalledWith("cs_test_1", {
      expand: [
        "line_items",
        "subscription",
        "discounts.promotion_code",
        "invoice.payments",
      ],
    });
  });

  // A 100% discount takes no money but still owes the customer everything.
  it("treats no_payment_required as paid", async () => {
    mocks.retrieve.mockResolvedValue(
      session({ payment_status: "no_payment_required" }),
    );

    await expect(confirmCheckout("cs_test_1")).resolves.toMatchObject({
      state: "paid",
    });
  });

  it("reports a delayed payment method as processing", async () => {
    mocks.retrieve.mockResolvedValue(session({ payment_status: "unpaid" }));

    await expect(confirmCheckout("cs_test_1")).resolves.toEqual({
      state: "processing",
    });
  });

  // The trap: an abandoned session also reads payment_status "unpaid", so
  // checking that alone would show "processing" to someone who never paid.
  it("treats an incomplete session as invalid, not processing", async () => {
    mocks.retrieve.mockResolvedValue(
      session({ status: "open", payment_status: "unpaid" }),
    );

    await expect(confirmCheckout("cs_test_1")).resolves.toEqual({
      state: "invalid",
    });
  });

  it("never writes for a session it rejects", async () => {
    mocks.retrieve.mockResolvedValue(session({ status: "expired" }));

    await confirmCheckout("cs_test_1");

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns invalid when Stripe has no such session", async () => {
    mocks.retrieve.mockRejectedValue(new Error("No such checkout session"));

    await expect(confirmCheckout("cs_bogus")).resolves.toEqual({
      state: "invalid",
    });
  });

  describe("time-box", () => {
    // session_id lives in browser history forever; the page that renders a
    // reference and an editable form must not stay a perpetual bearer URL.
    it("stops rendering a session older than 24h", async () => {
      mocks.retrieve.mockResolvedValue(
        session({ created: nowSeconds() - 25 * 60 * 60 }),
      );

      await expect(confirmCheckout("cs_test_1")).resolves.toEqual({
        state: "invalid",
      });
    });

    it("still renders one just inside the window", async () => {
      mocks.retrieve.mockResolvedValue(
        session({ created: nowSeconds() - 23 * 60 * 60 }),
      );

      await expect(confirmCheckout("cs_test_1")).resolves.toMatchObject({
        state: "paid",
      });
    });

    // Age gates the display, never the money: a webhook retried after a long
    // outage must still pay out.
    it("fulfils an old session even though it won't render it", async () => {
      mocks.retrieve.mockResolvedValue(
        session({ created: nowSeconds() - 25 * 60 * 60 }),
      );

      await confirmCheckout("cs_test_1");

      expect(mocks.transaction).toHaveBeenCalled();
    });
  });

  describe("missing metadata", () => {
    // Without name/whatsapp there's no Customer to create. Better to alert and
    // reconcile than to write a half-formed record.
    it("refuses to write when the buyer's details are absent", async () => {
      mocks.retrieve.mockResolvedValue(session({ metadata: {} }));

      await expect(confirmCheckout("cs_test_1")).resolves.toEqual({
        state: "invalid",
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("refuses to write when Stripe returned no customer", async () => {
      mocks.retrieve.mockResolvedValue(session({ customer: null }));

      await expect(confirmCheckout("cs_test_1")).resolves.toEqual({
        state: "invalid",
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    });
  });
});
