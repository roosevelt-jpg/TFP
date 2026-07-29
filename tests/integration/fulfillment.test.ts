import type Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { retrieve } = vi.hoisted(() => ({ retrieve: vi.fn() }));

// Stripe is the one thing stubbed: every DB write below hits real Postgres,
// because that is where the guarantees actually live.
vi.mock("@/lib/clients/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve } } },
  STRIPE_KEY_IS_LIVE: false,
}));

const { fulfillCheckout } = await import("@/lib/payments/fulfill-checkout");
const { db, resetFixtures, checkoutSession, subscription, MARKER } =
  await import("./harness");

beforeEach(async () => {
  vi.clearAllMocks();
  await resetFixtures();
});

afterAll(async () => {
  await resetFixtures();
  await db.$disconnect();
});

function serve(session: Stripe.Checkout.Session) {
  retrieve.mockResolvedValue(session);
  return session;
}

const purchasesFor = (email: string) =>
  db.purchase.findMany({ where: { customer: { email } } });

// Scoped to one session rather than the whole table: a developer's own test
// purchases must not fail the suite.
const purchasesForSession = (stripeCheckoutSessionId: string) =>
  db.purchase.count({ where: { stripeCheckoutSessionId } });

describe("fulfillCheckout", () => {
  it("writes customer, purchase and subscription from one session", async () => {
    const session = serve(
      checkoutSession({
        email: `single_${MARKER}@example.com`,
        subscription: subscription(),
      }),
    );

    const result = await fulfillCheckout(session.id);

    expect(result.state).toBe("fulfilled");

    const customer = await db.customer.findUnique({
      where: { email: `single_${MARKER}@example.com` },
      include: { purchases: true, subscriptions: true },
    });

    expect(customer?.purchases).toHaveLength(1);
    expect(customer?.purchases[0]?.amountTotal).toBe(14900);
    expect(customer?.purchases[0]?.status).toBe("paid");
    expect(customer?.subscriptions[0]?.status).toBe("trialing");
  });

  it("generates a human reference and a pdf token", async () => {
    const session = serve(checkoutSession());

    const result = await fulfillCheckout(session.id);

    expect(result.state === "fulfilled" && result.ref).toMatch(
      /^FP-[0-9A-HJ-NP-TV-Z]{8}$/,
    );

    const purchase = await db.purchase.findUnique({
      where: { stripeCheckoutSessionId: session.id },
    });
    // 32 random bytes, base64url.
    expect(purchase?.pdfToken.length).toBeGreaterThanOrEqual(43);
  });

  // Stripe's stated contract: safe to call multiple times, possibly
  // concurrently, for the same session id.
  describe("idempotency", () => {
    it("leaves exactly one purchase when the same session is fulfilled twice", async () => {
      const email = `twice_${MARKER}@example.com`;
      const session = serve(
        checkoutSession({ email, subscription: subscription() }),
      );

      const first = await fulfillCheckout(session.id);
      const second = await fulfillCheckout(session.id);

      expect(await purchasesFor(email)).toHaveLength(1);
      expect(first.state === "fulfilled" && second.state === "fulfilled").toBe(
        true,
      );
      // The reference a customer was shown must never change under them.
      expect(
        first.state === "fulfilled" && second.state === "fulfilled"
          ? first.ref === second.ref
          : false,
      ).toBe(true);
    });

    // The real dual-ingress race: webhook and success page landing together.
    it("survives concurrent ingresses on the same session", async () => {
      const email = `race_${MARKER}@example.com`;
      const session = serve(
        checkoutSession({ email, subscription: subscription() }),
      );

      const results = await Promise.allSettled([
        fulfillCheckout(session.id),
        fulfillCheckout(session.id),
        fulfillCheckout(session.id),
      ]);

      const rejected = results.filter((r) => r.status === "rejected");
      expect(rejected).toHaveLength(0);
      expect(await purchasesFor(email)).toHaveLength(1);
      expect(await db.customer.count({ where: { email } })).toBe(1);
    });

    // This is what stops Phase 3b sending a second welcome email on a replay.
    it("never resets the fulfillment step ledger", async () => {
      const session = serve(checkoutSession({ subscription: subscription() }));
      await fulfillCheckout(session.id);

      const sent = new Date();
      await db.purchase.update({
        where: { stripeCheckoutSessionId: session.id },
        data: { welcomeEmailAt: sent, pdfReadyAt: sent },
      });

      await fulfillCheckout(session.id);

      const purchase = await db.purchase.findUnique({
        where: { stripeCheckoutSessionId: session.id },
      });
      expect(purchase?.welcomeEmailAt).not.toBeNull();
      expect(purchase?.pdfReadyAt).not.toBeNull();
    });
  });

  describe("repeat buyers", () => {
    it("puts a second purchase on the same customer row", async () => {
      const email = `repeat_${MARKER}@example.com`;
      const whatsapp = "+447700900555";

      serve(checkoutSession({ email, whatsapp, customer: "cus_first" }));
      await fulfillCheckout(retrieve.mock.results[0]?.value.id);

      const second = serve(
        checkoutSession({ email, whatsapp, customer: "cus_second" }),
      );
      await fulfillCheckout(second.id);

      const customers = await db.customer.findMany({ where: { email } });
      expect(customers).toHaveLength(1);
      // Repointed at the newest Stripe Customer.
      expect(customers[0]?.stripeCustomerId).toBe("cus_second");
      expect(await purchasesFor(email)).toHaveLength(2);
    });

    it("keeps the original consent record", async () => {
      const email = `consent_${MARKER}@example.com`;
      const whatsapp = "+447700900556";

      const first = serve(checkoutSession({ email, whatsapp }));
      await fulfillCheckout(first.id);
      const before = await db.customer.findUnique({ where: { email } });

      const second = serve(checkoutSession({ email, whatsapp }));
      await fulfillCheckout(second.id);
      const after = await db.customer.findUnique({ where: { email } });

      expect(after?.consentAt).toEqual(before?.consentAt);
      expect(after?.consentText).toBe(before?.consentText);
    });
  });

  // Both contact fields are unique, so a buyer whose email matches one row and
  // phone another cannot be written without deciding which row is them. Getting
  // this wrong throws P2002 after the money is taken, and Stripe then retries
  // into a poison loop.
  describe("conflicting identities", () => {
    async function seedTwoCustomers() {
      const a = `conflict-a_${MARKER}@example.com`;
      const b = `conflict-b_${MARKER}@example.com`;
      const phoneA = "+447700931001";
      const phoneB = "+447700931002";

      serve(
        checkoutSession({ email: a, whatsapp: phoneA, customer: "cus_ca" }),
      );
      await fulfillCheckout(retrieve.mock.results.at(-1)?.value.id);
      serve(
        checkoutSession({ email: b, whatsapp: phoneB, customer: "cus_cb" }),
      );
      await fulfillCheckout(retrieve.mock.results.at(-1)?.value.id);

      return { a, b, phoneA, phoneB };
    }

    it("fulfils a buyer whose email and phone belong to different people", async () => {
      const { a, b, phoneA } = await seedTwoCustomers();

      // B's email arriving on A's phone.
      const session = serve(
        checkoutSession({ email: b, whatsapp: phoneA, customer: "cus_split" }),
      );

      await expect(fulfillCheckout(session.id)).resolves.toMatchObject({
        state: "fulfilled",
      });

      // Neither row's contact details are rewritten onto the other.
      const rowA = await db.customer.findUnique({ where: { email: a } });
      const rowB = await db.customer.findUnique({ where: { email: b } });
      expect(rowA?.whatsapp).toBe(phoneA);
      expect(rowB).not.toBeNull();
    });

    it("adopts a new email onto the customer matched by phone", async () => {
      const { phoneA } = await seedTwoCustomers();
      const moved = `moved_${MARKER}@example.com`;

      const session = serve(
        checkoutSession({
          email: moved,
          whatsapp: phoneA,
          customer: "cus_moved",
        }),
      );
      await fulfillCheckout(session.id);

      const row = await db.customer.findUnique({ where: { whatsapp: phoneA } });
      expect(row?.email).toBe(moved);
      expect(await db.customer.count({ where: { whatsapp: phoneA } })).toBe(1);
    });

    it("adopts a new phone onto the customer matched by email", async () => {
      const { a } = await seedTwoCustomers();
      const newPhone = "+447700939001";

      const session = serve(
        checkoutSession({
          email: a,
          whatsapp: newPhone,
          customer: "cus_newphone",
        }),
      );
      await fulfillCheckout(session.id);

      const row = await db.customer.findUnique({ where: { email: a } });
      expect(row?.whatsapp).toBe(newPhone);
    });
  });

  // Support reads this on a purchase to see which campaign it came from, so it
  // has to be the human code rather than the opaque promo_… id Stripe returns
  // when discounts.promotion_code isn't expanded.
  describe("promotion codes", () => {
    it("records the human code, not the promotion id", async () => {
      const email = `promo_${MARKER}@example.com`;
      const session = serve(
        checkoutSession({
          email,
          amountTotal: 7450,
          discountTotal: 7450,
          promoCode: "FORMULA50",
        }),
      );

      await fulfillCheckout(session.id);

      const [purchase] = await purchasesFor(email);
      expect(purchase?.promoCode).toBe("FORMULA50");
      expect(purchase?.discountTotal).toBe(7450);
      expect(purchase?.amountTotal).toBe(7450);
    });

    it("leaves promoCode null when no code was used", async () => {
      const email = `nopromo_${MARKER}@example.com`;
      serve(checkoutSession({ email }));

      await fulfillCheckout(retrieve.mock.results.at(-1)?.value.id);

      const [purchase] = await purchasesFor(email);
      expect(purchase?.promoCode).toBeNull();
      expect(purchase?.discountTotal).toBe(0);
    });
  });

  describe("payment states", () => {
    it("reports a delayed payment as unpaid without writing", async () => {
      const session = serve(checkoutSession({ paymentStatus: "unpaid" }));

      await expect(fulfillCheckout(session.id)).resolves.toEqual({
        state: "unpaid",
      });
      expect(await purchasesForSession(session.id)).toBe(0);
    });

    it("ignores an abandoned session", async () => {
      const session = serve(
        checkoutSession({ status: "open", paymentStatus: "unpaid" }),
      );

      await expect(fulfillCheckout(session.id)).resolves.toEqual({
        state: "invalid",
      });
      expect(await purchasesForSession(session.id)).toBe(0);
    });

    it("fulfils a fully discounted session", async () => {
      const session = serve(
        checkoutSession({
          paymentStatus: "no_payment_required",
          amountTotal: 0,
        }),
      );

      await expect(fulfillCheckout(session.id)).resolves.toMatchObject({
        state: "fulfilled",
      });
    });

    // Money is already taken, so this must surface as a failure the webhook can
    // retry, never as a quiet no-op.
    it("throws when a paid session is missing its metadata", async () => {
      const session = checkoutSession();
      session.metadata = {};
      serve(session);

      await expect(fulfillCheckout(session.id)).rejects.toThrow();
      expect(await purchasesForSession(session.id)).toBe(0);
    });
  });

  describe("subscription write fence", () => {
    it("applies a newer event over an older one", async () => {
      const sub = subscription({ status: "trialing" });
      const first = serve(checkoutSession({ subscription: sub }));
      await fulfillCheckout(first.id, 1000);

      const updated = subscription({ id: sub.id, status: "active" });
      const second = serve(checkoutSession({ subscription: updated }));
      await fulfillCheckout(second.id, 2000);

      const row = await db.subscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
      });
      expect(row?.status).toBe("active");
      expect(row?.lastStripeEventCreated).toBe(2000);
    });

    // The scenario the fence exists for: a delayed past_due arriving after a
    // terminal cancel would otherwise resurrect the subscription.
    it("discards an event older than the last applied", async () => {
      const sub = subscription({ status: "canceled" });
      const first = serve(checkoutSession({ subscription: sub }));
      await fulfillCheckout(first.id, 5000);

      const stale = subscription({ id: sub.id, status: "past_due" });
      const second = serve(checkoutSession({ subscription: stale }));
      await fulfillCheckout(second.id, 4000);

      const row = await db.subscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
      });
      expect(row?.status).toBe("canceled");
      expect(row?.lastStripeEventCreated).toBe(5000);
    });
  });
});
