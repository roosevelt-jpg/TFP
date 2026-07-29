import type Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { retrieveSession, retrieveSubscription } = vi.hoisted(() => ({
  retrieveSession: vi.fn(),
  retrieveSubscription: vi.fn(),
}));

vi.mock("@/lib/clients/stripe", () => ({
  stripe: {
    checkout: { sessions: { retrieve: retrieveSession } },
    subscriptions: { retrieve: retrieveSubscription },
  },
  STRIPE_KEY_IS_LIVE: false,
}));

const { fulfillCheckout } = await import("@/lib/payments/fulfill-checkout");
const { handleStripeEvent } = await import("@/lib/stripe-events/handle-event");
const { db, resetFixtures, checkoutSession, subscription, MARKER, uniq } =
  await import("./harness");

beforeEach(async () => {
  vi.clearAllMocks();
  await resetFixtures();
});

afterAll(async () => {
  await resetFixtures();
  await db.$disconnect();
});

// The state a customer is in after paying: trialing, £79 deferred to day 56.
async function seedMember(email: string) {
  // The session and subscription must name the same Stripe customer, which is
  // how later events resolve back to a customer of ours.
  const stripeCustomerId = uniq("cus");
  const sub = subscription({ status: "trialing", customer: stripeCustomerId });
  retrieveSession.mockResolvedValue(
    checkoutSession({ email, customer: stripeCustomerId, subscription: sub }),
  );
  await fulfillCheckout(retrieveSession.mock.results.at(-1)?.value.id, 1000);
  return { sub, stripeCustomerId };
}

function invoiceEvent(
  type: "invoice.paid" | "invoice.payment_failed",
  subscriptionId: string,
  created: number,
  extra: Record<string, unknown> = {},
) {
  const event = {
    id: uniq("evt"),
    type,
    livemode: false,
    created,
    data: {
      object: {
        id: uniq("in"),
        object: "invoice",
        parent: {
          type: "subscription_details",
          subscription_details: { subscription: subscriptionId },
        },
        attempt_count: 1,
        amount_due: 7900,
        ...extra,
      },
    },
  };
  return event as unknown as Stripe.Event;
}

function subscriptionEvent(
  type:
    | "customer.subscription.updated"
    | "customer.subscription.deleted"
    | "customer.subscription.trial_will_end",
  sub: Stripe.Subscription,
  created: number,
) {
  const event = {
    id: uniq("evt"),
    type,
    livemode: false,
    created,
    data: { object: sub },
  };
  return event as unknown as Stripe.Event;
}

const statusOf = async (id: string) =>
  (
    await db.subscription.findUnique({
      where: { stripeSubscriptionId: id },
      select: { status: true },
    })
  )?.status;

describe("subscription lifecycle", () => {
  // Day 56: the trial ends, the first £79 is charged, membership goes active.
  it("activates the membership when the first renewal is paid", async () => {
    const email = `renew_${MARKER}@example.com`;
    const { sub, stripeCustomerId } = await seedMember(email);
    expect(await statusOf(sub.id)).toBe("trialing");

    retrieveSubscription.mockResolvedValue(
      subscription({
        customer: stripeCustomerId,
        id: sub.id,
        status: "active",
        trialEnd: null,
      }),
    );
    const outcome = await handleStripeEvent(
      invoiceEvent("invoice.paid", sub.id, 2000),
      "invoice.paid",
    );

    expect(outcome).toBe("handled");
    expect(await statusOf(sub.id)).toBe("active");
  });

  describe("dunning", () => {
    // Stripe owns the retry schedule and the customer emails. We mirror the
    // state so access can follow it.
    it("marks the membership past_due when a renewal fails", async () => {
      const email = `dunning_${MARKER}@example.com`;
      const { sub, stripeCustomerId } = await seedMember(email);

      retrieveSubscription.mockResolvedValue(
        subscription({
          customer: stripeCustomerId,
          id: sub.id,
          status: "past_due",
          trialEnd: null,
        }),
      );
      await handleStripeEvent(
        invoiceEvent("invoice.payment_failed", sub.id, 2000),
        "invoice.payment_failed",
      );

      expect(await statusOf(sub.id)).toBe("past_due");
    });

    // A Smart Retry succeeding must restore access without anyone intervening.
    it("restores the membership when a retry succeeds", async () => {
      const email = `recover_${MARKER}@example.com`;
      const { sub, stripeCustomerId } = await seedMember(email);

      retrieveSubscription.mockResolvedValue(
        subscription({
          customer: stripeCustomerId,
          id: sub.id,
          status: "past_due",
          trialEnd: null,
        }),
      );
      await handleStripeEvent(
        invoiceEvent("invoice.payment_failed", sub.id, 2000),
        "invoice.payment_failed",
      );
      expect(await statusOf(sub.id)).toBe("past_due");

      retrieveSubscription.mockResolvedValue(
        subscription({
          customer: stripeCustomerId,
          id: sub.id,
          status: "active",
          trialEnd: null,
        }),
      );
      await handleStripeEvent(
        invoiceEvent("invoice.paid", sub.id, 3000),
        "invoice.paid",
      );

      expect(await statusOf(sub.id)).toBe("active");
    });

    // Retries exhausted with the account set to cancel.
    it("ends the membership when the subscription is deleted", async () => {
      const email = `lapse_${MARKER}@example.com`;
      const { sub, stripeCustomerId } = await seedMember(email);

      const canceled = subscription({
        customer: stripeCustomerId,
        id: sub.id,
        status: "canceled",
        trialEnd: null,
        canceledAt: 2500,
      });
      retrieveSubscription.mockResolvedValue(canceled);
      await handleStripeEvent(
        subscriptionEvent("customer.subscription.deleted", canceled, 3000),
        "subscription.deleted",
      );

      expect(await statusOf(sub.id)).toBe("canceled");
    });
  });

  // Events arrive unordered during dunning, and a stale past_due landing after
  // a terminal cancel would otherwise resurrect a membership nobody is paying.
  it("ignores an event older than the state already applied", async () => {
    const email = `ooo_${MARKER}@example.com`;
    const { sub, stripeCustomerId } = await seedMember(email);

    const canceled = subscription({
      customer: stripeCustomerId,
      id: sub.id,
      status: "canceled",
    });
    retrieveSubscription.mockResolvedValue(canceled);
    await handleStripeEvent(
      subscriptionEvent("customer.subscription.deleted", canceled, 5000),
      "subscription.deleted",
    );
    expect(await statusOf(sub.id)).toBe("canceled");

    retrieveSubscription.mockResolvedValue(
      subscription({
        customer: stripeCustomerId,
        id: sub.id,
        status: "past_due",
      }),
    );
    await handleStripeEvent(
      invoiceEvent("invoice.payment_failed", sub.id, 4000),
      "invoice.payment_failed",
    );

    expect(await statusOf(sub.id)).toBe("canceled");
  });

  // A portal cancellation keeps access until the paid period ends.
  it("records a cancellation scheduled for the period end", async () => {
    const email = `portal_${MARKER}@example.com`;
    const { sub, stripeCustomerId } = await seedMember(email);

    const ending = subscription({
      customer: stripeCustomerId,
      id: sub.id,
      status: "active",
      cancelAtPeriodEnd: true,
    });
    retrieveSubscription.mockResolvedValue(ending);
    await handleStripeEvent(
      subscriptionEvent("customer.subscription.updated", ending, 2000),
      "subscription.changed",
    );

    const row = await db.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
    });
    expect(row?.status).toBe("active");
    expect(row?.cancelAtPeriodEnd).toBe(true);
  });

  // The Shopify catalogue and hand-sold tiers share this Stripe account, so
  // their events reach us and must not create rows.
  it("ignores a subscription belonging to nobody we know", async () => {
    const stranger = subscription({ status: "active" });
    retrieveSubscription.mockResolvedValue(stranger);

    const outcome = await handleStripeEvent(
      subscriptionEvent("customer.subscription.updated", stranger, 2000),
      "subscription.changed",
    );

    expect(outcome).toBe("handled");
    expect(await statusOf(stranger.id)).toBeUndefined();
  });
});
