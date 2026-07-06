import { beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

import { actionClient } from "@/lib/safe-action";

const { checkRateLimitMock, clientIpMock } = vi.hoisted(() => ({
  checkRateLimitMock:
    vi.fn<
      (
        tier: string,
        key: string,
      ) => Promise<{ success: boolean; retryAfter: number }>
    >(),
  clientIpMock: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: checkRateLimitMock }));
vi.mock("@/lib/client-ip", () => ({ clientIp: clientIpMock }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const testAction = actionClient
  .metadata({ actionName: "joinWaitlist" })
  .inputSchema(z.object({ email: z.unknown().optional() }))
  .action(async () => ({ ok: true }));

const allow = { success: true, retryAfter: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimitMock.mockResolvedValue(allow);
  clientIpMock.mockResolvedValue("1.2.3.4");
});

describe("rateLimitMiddleware", () => {
  it("checks global, then per-IP, then per-email with namespaced keys", async () => {
    const result = await testAction({ email: "User@Example.com " });

    expect(result.data).toEqual({ ok: true });
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(1, "global", "all");
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      2,
      "ip",
      "joinWaitlist:1.2.3.4",
    );
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      3,
      "email",
      "joinWaitlist:user@example.com",
    );
  });

  it("short-circuits on a global block before touching per-key tiers", async () => {
    checkRateLimitMock.mockResolvedValueOnce({
      success: false,
      retryAfter: 42,
    });

    const result = await testAction({ email: "user@example.com" });

    expect(result.serverError).toBe(
      "Too many attempts. Please wait 42 seconds and try again.",
    );
    expect(checkRateLimitMock).toHaveBeenCalledTimes(1);
  });

  it("stops at the IP tier when it blocks, sparing the email check", async () => {
    checkRateLimitMock
      .mockResolvedValueOnce(allow)
      .mockResolvedValueOnce({ success: false, retryAfter: 7 });

    const result = await testAction({ email: "user@example.com" });

    expect(result.serverError).toBe(
      "Too many attempts. Please wait 7 seconds and try again.",
    );
    expect(checkRateLimitMock).toHaveBeenCalledTimes(2);
  });

  it("skips the IP tier when no client IP header is present", async () => {
    clientIpMock.mockResolvedValue(null);

    await testAction({ email: "user@example.com" });

    expect(checkRateLimitMock).toHaveBeenCalledTimes(2);
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      2,
      "email",
      "joinWaitlist:user@example.com",
    );
  });

  it("skips the email tier when the raw input has no usable email", async () => {
    await testAction({ email: 123 });
    await testAction({});

    expect(checkRateLimitMock).toHaveBeenCalledTimes(4);
    expect(checkRateLimitMock.mock.calls.map(([tier]) => tier)).toEqual([
      "global",
      "ip",
      "global",
      "ip",
    ]);
  });
});
