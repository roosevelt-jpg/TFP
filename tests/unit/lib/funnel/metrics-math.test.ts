import { describe, expect, it } from "vitest";

import {
  activatedWithin24h,
  attributionCoverage,
  deliveryHealth,
  humanResponseMinutes,
  rate,
  recoveredPurchasers,
} from "@/lib/funnel/metrics-math";

describe("funnel metric formulas", () => {
  it("returns null when the denominator is zero", () => {
    expect(rate(1, 0)).toBeNull();
  });

  it("counts a purchase recovered only after abandonment", () => {
    expect(
      recoveredPurchasers(
        ["c1", "c2"],
        [
          { customerId: "c1", at: new Date("2026-01-02") },
          { customerId: "c3", at: new Date("2026-01-02") },
        ],
      ),
    ).toBe(1);
  });

  it("counts activation only inside 24 hours", () => {
    const paid = new Date("2026-01-01T00:00:00Z");
    expect(
      activatedWithin24h(
        [{ customerId: "c1", at: paid }],
        [
          {
            customerId: "c1",
            at: new Date("2026-01-01T20:00:00Z"),
          },
        ],
      ),
    ).toBe(1);
    expect(
      activatedWithin24h(
        [{ customerId: "c1", at: paid }],
        [
          {
            customerId: "c1",
            at: new Date("2026-01-03T00:00:00Z"),
          },
        ],
      ),
    ).toBe(0);
  });

  it("requires funnel version and a source for attribution coverage", () => {
    const result = attributionCoverage([
      { properties: { funnelVersion: "funnel-v2", source: "direct" } },
      { properties: { funnelVersion: "funnel-v2" } },
    ]);
    expect(result).toEqual({ covered: 1, total: 2, pct: 50 });
  });

  it("measures delivery health by channel", () => {
    expect(
      deliveryHealth([
        { channel: "email", status: "delivered", count: 3 },
        { channel: "email", status: "failed", count: 1 },
      ]),
    ).toEqual([
      { channel: "email", accepted: 4, delivered: 3, pct: 75 },
    ]);
  });

  it("averages human reply time and counts threads still waiting", () => {
    const inbound = new Date("2026-01-01T10:00:00Z");
    const reply = new Date("2026-01-01T10:30:00Z");
    expect(
      humanResponseMinutes([
        { lastInboundAt: inbound, lastReplyAt: reply },
        { lastInboundAt: inbound, lastReplyAt: null },
      ]),
    ).toEqual({ averageMinutes: 30, answered: 1, awaiting: 1 });
  });
});
