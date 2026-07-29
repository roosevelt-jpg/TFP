import { beforeEach, describe, expect, it, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: { executeRaw: vi.fn() },
}));

vi.mock("@/db", () => ({ db: { $executeRaw: mocks.executeRaw } }));

const { recordStripeEvent } = await import("@/lib/stripe-events/persist-event");

const event = {
  id: "evt_1",
  type: "checkout.session.completed",
  livemode: false,
} as never;

beforeEach(() => vi.clearAllMocks());

describe("recordStripeEvent", () => {
  it("proceeds when it wins the insert", async () => {
    mocks.executeRaw.mockResolvedValueOnce(1);

    await expect(recordStripeEvent(event)).resolves.toEqual({ proceed: true });
    expect(mocks.executeRaw).toHaveBeenCalledTimes(1);
  });

  it("proceeds when it reclaims a crashed attempt", async () => {
    mocks.executeRaw.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    await expect(recordStripeEvent(event)).resolves.toEqual({ proceed: true });
  });

  it("stops when the event is already settled", async () => {
    mocks.executeRaw.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await expect(recordStripeEvent(event)).resolves.toEqual({ proceed: false });
  });

  // The insert writes `enqueued` before the handler runs, so a process killed
  // mid-handler leaves a row claimed by nobody. If this status ever drops out
  // of the reclaim, Stripe's retry is acked as a duplicate and the payment is
  // lost silently — the exact failure this table exists to prevent.
  it("keeps a stale enqueued claim reclaimable", async () => {
    mocks.executeRaw.mockResolvedValue(0);

    await recordStripeEvent(event);

    const [, reclaim] = mocks.executeRaw.mock.calls;
    const sql: string = reclaim[0].join(" ? ");
    const statuses: string[] = reclaim.slice(1);

    // The stale branch: an enqueued row older than the claim window.
    expect(sql).toContain('"receivedAt" <');
    expect(statuses).toContain("enqueued");
    expect(statuses).toContain("failed");
  });
});
