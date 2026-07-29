import { createHmac } from "node:crypto";

import type Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { retrieve } = vi.hoisted(() => ({ retrieve: vi.fn() }));

// Only the Stripe fetch is stubbed. Signature verification uses the real SDK
// and every write below lands in Postgres, so this exercises the whole path a
// live delivery takes.
vi.mock("@/lib/clients/stripe", async () => {
  const Stripe = (await import("stripe")).default;
  const real = new Stripe("sk_test_fake", { apiVersion: Stripe.API_VERSION });
  return {
    stripe: {
      webhooks: real.webhooks,
      checkout: { sessions: { retrieve } },
    },
    STRIPE_KEY_IS_LIVE: false,
  };
});

const { POST } = await import("@/app/api/stripe/webhook/route");
const { db, resetFixtures, checkoutSession, subscription, MARKER, uniq } =
  await import("./harness");

const SECRET = "whsec_ci_placeholder";

// Scoped to one session rather than the whole table: a developer's own test
// purchases must not fail the suite.
const purchasesForSession = (stripeCheckoutSessionId: string) =>
  db.purchase.count({ where: { stripeCheckoutSessionId } });

function delivery(event: Record<string, unknown>, secret = SECRET) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": `t=${timestamp},v1=${signature}` },
    body,
  });
}

function completedEvent(session: Stripe.Checkout.Session, id = uniq("evt")) {
  return {
    id,
    type: "checkout.session.completed",
    livemode: false,
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: session.id } },
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  await resetFixtures();
});

afterAll(async () => {
  await resetFixtures();
  await db.$disconnect();
});

describe("POST /api/stripe/webhook", () => {
  it("fulfils a signed checkout.session.completed", async () => {
    const email = `wh_${MARKER}@example.com`;
    const session = checkoutSession({ email, subscription: subscription() });
    retrieve.mockResolvedValue(session);
    const event = completedEvent(session);

    const response = await POST(delivery(event));

    expect(response.status).toBe(200);

    const customer = await db.customer.findUnique({
      where: { email },
      include: { purchases: true, subscriptions: true },
    });
    expect(customer?.purchases).toHaveLength(1);
    expect(customer?.subscriptions).toHaveLength(1);

    const row = await db.stripeEvent.findUnique({ where: { id: event.id } });
    expect(row?.status).toBe("processed");
  });

  it("rejects a tampered signature without touching the database", async () => {
    const session = checkoutSession();
    retrieve.mockResolvedValue(session);

    const response = await POST(
      delivery(completedEvent(session), "whsec_wrong_secret"),
    );

    expect(response.status).toBe(400);
    expect(await purchasesForSession(session.id)).toBe(0);
    expect(retrieve).not.toHaveBeenCalled();
  });

  // Stripe retries on any non-2xx, and a duplicate must never fulfil twice.
  it("ignores a replay of an event it already processed", async () => {
    const email = `replay_${MARKER}@example.com`;
    const session = checkoutSession({ email, subscription: subscription() });
    retrieve.mockResolvedValue(session);
    const event = completedEvent(session);

    await POST(delivery(event));
    const second = await POST(delivery(event));

    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });
    expect(await db.purchase.count({ where: { customer: { email } } })).toBe(1);
  });

  // 500 so Stripe retries, with the row left findable for redrive.
  it("marks a failed handler as failed and asks for a retry", async () => {
    const session = checkoutSession();
    session.metadata = {};
    retrieve.mockResolvedValue(session);
    const event = completedEvent(session);

    const response = await POST(delivery(event));

    expect(response.status).toBe(500);
    const row = await db.stripeEvent.findUnique({ where: { id: event.id } });
    expect(row?.status).toBe("failed");
    expect(row?.lastError).toBeTruthy();
  });

  // A failed row must be reclaimable, or the payment is lost when Stripe
  // retries and the duplicate check acks it.
  it("lets Stripe's retry recover a previously failed event", async () => {
    const email = `recover_${MARKER}@example.com`;
    const broken = checkoutSession({ email });
    broken.metadata = {};
    retrieve.mockResolvedValue(broken);
    const event = completedEvent(broken);

    await POST(delivery(event));
    expect(await purchasesForSession(broken.id)).toBe(0);

    // Same event id, but now the session reads correctly.
    retrieve.mockResolvedValue(
      checkoutSession({ id: broken.id, email, subscription: subscription() }),
    );
    const retry = await POST(delivery(event));

    expect(retry.status).toBe(200);
    expect(await db.purchase.count({ where: { customer: { email } } })).toBe(1);
    const row = await db.stripeEvent.findUnique({ where: { id: event.id } });
    expect(row?.status).toBe("processed");
    expect(row?.attempts).toBe(1);
  });

  it("records an unhandled type as skipped without fulfilling", async () => {
    const event = {
      id: uniq("evt"),
      type: "product.created",
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: "prod_1" } },
    };

    const response = await POST(delivery(event));

    expect(response.status).toBe(200);
    const row = await db.stripeEvent.findUnique({ where: { id: event.id } });
    expect(row?.status).toBe("skipped");
    expect(retrieve).not.toHaveBeenCalled();
  });

  // Subscribed to, but the handler ships in a later phase: it must stay
  // findable for redrive rather than look like finished work.
  it("leaves a deferred event as received", async () => {
    const event = {
      id: uniq("evt"),
      type: "checkout.session.expired",
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: "cs_expired_1" } },
    };

    const response = await POST(delivery(event));

    expect(response.status).toBe(200);
    const row = await db.stripeEvent.findUnique({ where: { id: event.id } });
    expect(row?.status).toBe("received");
  });

  // A test event reaching live data would create fake customers and fire real
  // emails. 200 so Stripe stops retrying something we will never accept.
  it("refuses an event from the wrong livemode", async () => {
    const session = checkoutSession();
    retrieve.mockResolvedValue(session);
    const event = { ...completedEvent(session), livemode: true };

    const response = await POST(delivery(event));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ignored: "livemode",
    });
    expect(await db.stripeEvent.count({ where: { id: event.id } })).toBe(0);
    expect(await purchasesForSession(session.id)).toBe(0);
  });
});
