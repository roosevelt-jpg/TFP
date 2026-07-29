import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkoutEventId,
  checkoutIdempotencyKey,
  customerIdempotencyKey,
} from "@/lib/payments/idempotency";

afterEach(() => vi.useRealTimers());

describe("idempotency keys", () => {
  it("stays inside Stripe's 255 character limit", () => {
    expect(customerIdempotencyKey("a@b.com", "+447700900000").length).toBe(40);
  });

  // Stripe's guidance: keep personal identifiers out of keys.
  it("leaks no personal data", () => {
    const key = customerIdempotencyKey("buyer@example.com", "+447700900000");

    expect(key).not.toContain("buyer");
    expect(key).not.toContain("example.com");
    expect(key).not.toContain("447700900000");
    expect(key).toMatch(/^[0-9a-f]{40}$/);
  });

  it("repeats for the same buyer within the window", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-07-28T10:00:00Z"));
    const first = customerIdempotencyKey("a@b.com", "+447700900000");

    vi.setSystemTime(new Date("2026-07-28T10:45:00Z"));
    expect(customerIdempotencyKey("a@b.com", "+447700900000")).toBe(first);
  });

  // A deliberate retry after a declined card must open a fresh session rather
  // than replay the old one.
  it("rotates once the window passes", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-07-28T10:00:00Z"));
    const first = checkoutIdempotencyKey("cus_1");

    vi.setSystemTime(new Date("2026-07-28T11:30:00Z"));
    expect(checkoutIdempotencyKey("cus_1")).not.toBe(first);
  });

  it("differs per buyer", () => {
    expect(customerIdempotencyKey("a@b.com", "+447700900001")).not.toBe(
      customerIdempotencyKey("a@b.com", "+447700900002"),
    );
    expect(checkoutIdempotencyKey("cus_1")).not.toBe(
      checkoutIdempotencyKey("cus_2"),
    );
  });

  // Two different operations for the same person must never collide.
  it("separates the customer and checkout scopes", () => {
    expect(customerIdempotencyKey("cus_1", "cus_1")).not.toBe(
      checkoutIdempotencyKey("cus_1"),
    );
    expect(checkoutEventId("cus_1")).not.toBe(checkoutIdempotencyKey("cus_1"));
  });
});

// Stripe rejects a reused idempotency key whose parameters have changed, rather
// than replaying the original. eventId rides in the session metadata, so a
// random one per attempt made every retry inside the window fail outright —
// which is exactly what happened on the first real test purchase.
describe("checkoutEventId", () => {
  it("holds still for as long as the key it travels with", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-07-28T10:00:00Z"));
    const key = checkoutIdempotencyKey("cus_1");
    const eventId = checkoutEventId("cus_1");

    vi.setSystemTime(new Date("2026-07-28T10:45:00Z"));

    // Both still in the same bucket, so a retry sends identical parameters.
    expect(checkoutIdempotencyKey("cus_1")).toBe(key);
    expect(checkoutEventId("cus_1")).toBe(eventId);
  });

  // Once the key rotates the session is genuinely new, so the analytics event
  // must be too or the second purchase would deduplicate against the first.
  it("rotates with the key, never independently", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-07-28T10:00:00Z"));
    const key = checkoutIdempotencyKey("cus_1");
    const eventId = checkoutEventId("cus_1");

    vi.setSystemTime(new Date("2026-07-28T11:30:00Z"));

    expect(checkoutIdempotencyKey("cus_1")).not.toBe(key);
    expect(checkoutEventId("cus_1")).not.toBe(eventId);
  });

  it("differs per buyer", () => {
    expect(checkoutEventId("cus_1")).not.toBe(checkoutEventId("cus_2"));
  });
});
