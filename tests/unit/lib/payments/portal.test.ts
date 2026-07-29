import { beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/clients/stripe", () => ({
  stripe: { billingPortal: { sessions: { create } } },
}));

const { createPortalSession } = await import("@/lib/payments/portal");

beforeEach(() => vi.clearAllMocks());

describe("createPortalSession", () => {
  it("returns the portal url for a known customer", async () => {
    create.mockResolvedValue({ url: "https://billing.stripe.com/session/abc" });

    await expect(createPortalSession("cus_1", "/success?x=1")).resolves.toBe(
      "https://billing.stripe.com/session/abc",
    );
  });

  // Absolute, because Stripe redirects the browser back here afterwards.
  it("sends an absolute return url", async () => {
    create.mockResolvedValue({ url: "https://billing.stripe.com/session/abc" });

    await createPortalSession("cus_1", "/success?session_id=cs_1");

    expect(create).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "https://example.com/success?session_id=cs_1",
    });
  });

  // A portal outage must surface as a retryable message, not an unhandled throw
  // on a page someone has already paid to reach.
  it("returns null rather than throwing when Stripe refuses", async () => {
    create.mockRejectedValue(new Error("No such customer"));

    await expect(
      createPortalSession("cus_gone", "/success"),
    ).resolves.toBeNull();
  });
});
