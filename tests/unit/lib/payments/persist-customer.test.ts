import { beforeEach, describe, expect, it, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mocks.error },
}));

const { upsertCustomer } = await import("@/lib/payments/persist-customer");

const tx = {
  customer: {
    findUnique: mocks.findUnique,
    findFirst: mocks.findFirst,
    createMany: mocks.createMany,
    update: mocks.update,
  },
} as never;

const details = {
  sessionId: "cs_1",
  createdAt: 0,
  stripeCustomerId: "cus_new",
  email: "buyer@example.com",
  whatsapp: "+447700900123",
  name: "Kane Mousah",
  consentText: "consent",
  policyVersion: "2026-07-26",
  waitlistId: null,
  eventId: null,
  amountTotal: 14900,
  discountTotal: 0,
  currency: "gbp",
  promoCode: null,
  subscription: null,
  stripeInvoiceId: null,
  stripePaymentIntentId: null,
};

// findUnique is called for stripeCustomerId, email, whatsapp in that order.
function resolve(
  byStripeId: { id: string } | null,
  byEmail: { id: string } | null,
  byPhone: { id: string } | null,
) {
  mocks.findUnique
    .mockResolvedValueOnce(byStripeId)
    .mockResolvedValueOnce(byEmail)
    .mockResolvedValueOnce(byPhone);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createMany.mockResolvedValue({ count: 1 });
  mocks.findFirst.mockResolvedValue({ id: "cust_created" });
  mocks.update.mockResolvedValue({ id: "cust_updated" });
});

describe("upsertCustomer", () => {
  // createMany with skipDuplicates compiles to ON CONFLICT DO NOTHING, so two
  // events for the same buyer landing together cannot make one of them throw
  // after the money has been taken.
  it("creates a row atomically when nothing matches", async () => {
    resolve(null, null, null);

    await expect(upsertCustomer(tx, details)).resolves.toBe("cust_created");
    expect(mocks.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("prefers the stored Stripe id over the contact fields", async () => {
    resolve({ id: "cust_stripe" }, { id: "cust_email" }, null);

    await expect(upsertCustomer(tx, details)).resolves.toBe("cust_stripe");
  });

  // Stripe mints a fresh Customer per checkout, so a repeat buyer arrives with
  // an unrecognised Stripe id and is found by email.
  it("repoints an existing customer at the newest Stripe id", async () => {
    resolve(null, { id: "cust_1" }, { id: "cust_1" });

    await upsertCustomer(tx, details);

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cust_1" },
        data: expect.objectContaining({ stripeCustomerId: "cus_new" }),
      }),
    );
  });

  describe("conflicting contact details", () => {
    // The bug this file exists to prevent: email matches one person, phone
    // another. Writing either field violates a unique index AFTER the money has
    // been taken, which Stripe then retries forever.
    it("never writes a field another customer owns", async () => {
      resolve(null, { id: "cust_email" }, { id: "cust_phone" });

      await expect(upsertCustomer(tx, details)).resolves.toBe("cust_email");

      const data = mocks.update.mock.calls[0]?.[0].data;
      expect(data).not.toHaveProperty("whatsapp");
      expect(mocks.error).toHaveBeenCalled();
    });

    it("adopts a free phone number onto the matched row", async () => {
      resolve(null, { id: "cust_1" }, null);

      await upsertCustomer(tx, details);

      expect(mocks.update.mock.calls[0]?.[0].data).toMatchObject({
        whatsapp: "+447700900123",
      });
    });

    it("adopts a free email onto a row matched by phone", async () => {
      resolve(null, null, { id: "cust_1" });

      await upsertCustomer(tx, details);

      expect(mocks.update.mock.calls[0]?.[0].data).toMatchObject({
        email: "buyer@example.com",
      });
    });
  });

  // Consent is proof of what they agreed to at the time, so a later purchase
  // must not overwrite it.
  it("never rewrites the consent record", async () => {
    resolve(null, { id: "cust_1" }, { id: "cust_1" });

    await upsertCustomer(tx, details);

    const data = mocks.update.mock.calls[0]?.[0].data;
    expect(data).not.toHaveProperty("consentText");
    expect(data).not.toHaveProperty("policyVersion");
  });
});
