import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { StripeEventStatus } from "@/generated/prisma/enums";

const WEBHOOK_SECRET = "whsec_ci_placeholder";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    recordStripeEvent: vi.fn(),
    markStripeEventStatus: vi.fn(),
    handleStripeEvent: vi.fn(),
    keyIsLive: false,
  },
}));

vi.mock("@/lib/stripe-events/persist-event", () => ({
  recordStripeEvent: mocks.recordStripeEvent,
  markStripeEventStatus: mocks.markStripeEventStatus,
}));

vi.mock("@/lib/stripe-events/handle-event", () => ({
  handleStripeEvent: mocks.handleStripeEvent,
}));

vi.mock("@/lib/clients/stripe", async () => {
  const Stripe = (await import("stripe")).default;
  return {
    stripe: new Stripe("sk_test_fake", { apiVersion: Stripe.API_VERSION }),
    get STRIPE_KEY_IS_LIVE() {
      return mocks.keyIsLive;
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { POST } = await import("@/app/api/stripe/webhook/route");

function signedRequest(
  body: string,
  { secret = WEBHOOK_SECRET, timestamp = Math.floor(Date.now() / 1000) } = {},
) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": `t=${timestamp},v1=${signature}` },
    body,
  });
}

function eventBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_test_123",
    object: "event",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: { id: "cs_test_123", object: "checkout.session" } },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.keyIsLive = false;
  mocks.recordStripeEvent.mockResolvedValue({ proceed: true });
  mocks.markStripeEventStatus.mockResolvedValue(undefined);
});

describe("signature verification", () => {
  it("accepts a correctly signed event", async () => {
    const response = await POST(signedRequest(eventBody()));

    expect(response.status).toBe(200);
    expect(mocks.recordStripeEvent).toHaveBeenCalledOnce();
  });

  it("rejects a request with no signature header", async () => {
    const response = await POST(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        body: eventBody(),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects a signature made with the wrong secret", async () => {
    const response = await POST(
      signedRequest(eventBody(), { secret: "whsec_attacker" }),
    );

    expect(response.status).toBe(400);
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });

  // The signature covers timestamp + body, so altering the body after signing
  // must invalidate it.
  it("rejects a tampered body", async () => {
    const request = signedRequest(eventBody());
    const tampered = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: eventBody({ id: "evt_swapped" }),
    });

    const response = await POST(tampered);

    expect(response.status).toBe(400);
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });

  // Replay protection: a captured payload replayed later fails the tolerance
  // check even though its signature is authentic.
  it("rejects an old timestamp outside the tolerance window", async () => {
    const response = await POST(
      signedRequest(eventBody(), {
        timestamp: Math.floor(Date.now() / 1000) - 60 * 60,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });
});

describe("livemode guard", () => {
  it("ignores a test event when the key is live", async () => {
    mocks.keyIsLive = true;

    const response = await POST(signedRequest(eventBody({ livemode: false })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ignored: "livemode",
    });
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });

  it("ignores a live event when the key is test", async () => {
    const response = await POST(signedRequest(eventBody({ livemode: true })));

    await expect(response.json()).resolves.toMatchObject({
      ignored: "livemode",
    });
    expect(mocks.recordStripeEvent).not.toHaveBeenCalled();
  });
});

describe("deduplication", () => {
  it("acks without re-processing an already settled event", async () => {
    mocks.recordStripeEvent.mockResolvedValue({ proceed: false });

    const response = await POST(signedRequest(eventBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ duplicate: true });
    expect(mocks.markStripeEventStatus).not.toHaveBeenCalled();
  });

  // The lost-payment case: a previous delivery wrote the row then died before
  // doing anything. Stripe's retry MUST get through rather than be silently
  // acked as a duplicate.
  it("proceeds when a prior attempt never got past received", async () => {
    mocks.recordStripeEvent.mockResolvedValue({ proceed: true });

    const response = await POST(signedRequest(eventBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.not.toMatchObject({
      duplicate: true,
    });
  });
});

describe("routing", () => {
  it("marks an unrelated event skipped and acks it", async () => {
    const response = await POST(
      signedRequest(eventBody({ type: "product.created" })),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      skipped: "unhandled_type",
    });
    expect(mocks.markStripeEventStatus).toHaveBeenCalledWith(
      "evt_test_123",
      StripeEventStatus.skipped,
    );
  });

  it("marks a handled event processed once its work is done", async () => {
    mocks.handleStripeEvent.mockResolvedValueOnce("handled");

    const response = await POST(signedRequest(eventBody()));

    expect(response.status).toBe(200);
    expect(mocks.markStripeEventStatus).toHaveBeenCalledWith(
      "evt_test_123",
      StripeEventStatus.processed,
    );
  });

  // An event we subscribe to but whose handler ships later must stay findable
  // for redrive, not look like finished work.
  it("leaves a deferred event as received", async () => {
    mocks.handleStripeEvent.mockResolvedValueOnce("deferred");

    const response = await POST(signedRequest(eventBody()));

    expect(response.status).toBe(200);
    expect(mocks.markStripeEventStatus).toHaveBeenCalledWith(
      "evt_test_123",
      StripeEventStatus.received,
    );
  });

  // 500 on purpose so Stripe retries, with the row left as a redrive candidate.
  it("leaves a failed handler as failed and asks Stripe to retry", async () => {
    mocks.handleStripeEvent.mockRejectedValueOnce(new Error("db down"));

    const response = await POST(signedRequest(eventBody()));

    expect(response.status).toBe(500);
    expect(mocks.markStripeEventStatus).toHaveBeenCalledWith(
      "evt_test_123",
      StripeEventStatus.failed,
      "db down",
    );
  });
});
