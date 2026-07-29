import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/db", () => ({ db: { stripeEvent: { findMany } } }));

const { findStuckEvents } = await import(
  "@/data/payments/queries/find-stuck-events"
);

const NOW = new Date("2026-07-28T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const event = (overrides: Record<string, unknown> = {}) => ({
  id: "evt_1",
  type: "checkout.session.completed",
  payload: { id: "evt_1", type: "checkout.session.completed", data: {} },
  attempts: 3,
  receivedAt: new Date(NOW.getTime() - 4 * DAY),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  findMany.mockResolvedValue([]);
});

afterEach(() => vi.useRealTimers());

const whereClause = () => findMany.mock.calls[0]?.[0].where;

describe("findStuckEvents", () => {
  // Stripe retries for three days. Sweeping inside that window would race its
  // own retries and double-handle events it was about to redeliver.
  it("ignores anything Stripe might still retry", async () => {
    await findStuckEvents(50);

    const cutoff = whereClause().receivedAt.lt;

    expect(cutoff).toEqual(new Date(NOW.getTime() - 72 * HOUR));
  });

  // Past 30 days the payload can't be re-fetched from Stripe either, so it is a
  // permanent hole rather than something to retry nightly forever.
  it("gives up on events older than Stripe's payload retention", async () => {
    await findStuckEvents(50);

    expect(whereClause().receivedAt.gt).toEqual(
      new Date(NOW.getTime() - 30 * DAY),
    );
  });

  it("looks for every non-terminal state", async () => {
    await findStuckEvents(50);

    // enqueued matters: it means a process died mid-handler, so nobody owns it.
    expect(whereClause().status.in).toEqual(
      expect.arrayContaining(["failed", "received", "enqueued"]),
    );
  });

  it("never touches a processed or skipped event", async () => {
    await findStuckEvents(50);

    expect(whereClause().status.in).not.toContain("processed");
    expect(whereClause().status.in).not.toContain("skipped");
  });

  it("replays oldest first so a backlog drains in order", async () => {
    await findStuckEvents(50);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual({ receivedAt: "asc" });
    expect(findMany.mock.calls[0]?.[0].take).toBe(50);
  });

  it("returns rows that carry a usable event", async () => {
    findMany.mockResolvedValue([event()]);

    await expect(findStuckEvents(50)).resolves.toHaveLength(1);
  });

  // The column is Json, so nothing guarantees its shape. A malformed row must
  // not take the whole sweep down with it.
  describe("drops rows it cannot replay", () => {
    const malformed: [string, unknown][] = [
      ["null payload", null],
      ["a string", "not-an-event"],
      ["missing data", { id: "evt_1", type: "invoice.paid" }],
      ["missing type", { id: "evt_1", data: {} }],
      ["an empty object", {}],
    ];

    for (const [label, payload] of malformed) {
      it(label, async () => {
        findMany.mockResolvedValue([event({ payload })]);

        await expect(findStuckEvents(50)).resolves.toEqual([]);
      });
    }

    it("keeps the good rows beside a bad one", async () => {
      findMany.mockResolvedValue([
        event({ id: "evt_bad", payload: null }),
        event({ id: "evt_good" }),
      ]);

      const found = await findStuckEvents(50);

      expect(found.map((row) => row.id)).toEqual(["evt_good"]);
    });
  });
});
