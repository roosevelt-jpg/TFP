import { describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

type LimiterConfig = {
  prefix: string;
  timeout: number;
  limiter: { limit: number; window: string };
};

const { limitMock, limiterConfigs } = vi.hoisted(() => {
  const configs: LimiterConfig[] = [];
  return {
    limitMock:
      vi.fn<(key: string) => Promise<{ success: boolean; reset: number }>>(),
    limiterConfigs: configs,
  };
});

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow(limit: number, window: string) {
      return { limit, window };
    }
    limit = limitMock;
    constructor(config: LimiterConfig) {
      limiterConfigs.push(config);
    }
  }
  return { Ratelimit };
});

vi.mock("@/lib/clients/redis", () => ({ redis: {} }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("tier wiring", () => {
  it("builds the documented tiers with distinct prefixes", () => {
    expect(limiterConfigs).toHaveLength(5);
    expect(limiterConfigs.map((c) => c.prefix)).toEqual([
      "ratelimit:global",
      "ratelimit:ip",
      "ratelimit:email",
      "ratelimit:checkoutEmail",
      "ratelimit:download",
    ]);
    expect(limiterConfigs.map((c) => c.limiter)).toEqual([
      { limit: 5000, window: "1 m" },
      { limit: 30, window: "1 m" },
      { limit: 3, window: "1 m" },
      { limit: 10, window: "5 m" },
      { limit: 40, window: "5 m" },
    ]);
  });

  // A buyer whose card declines comes back and retries. Hitting the waitlist's
  // 3/min at that moment costs a sale, so checkout must be looser.
  it("gives checkout more headroom than the waitlist", () => {
    const email = limiterConfigs.find((c) => c.prefix === "ratelimit:email");
    const checkout = limiterConfigs.find(
      (c) => c.prefix === "ratelimit:checkoutEmail",
    );

    expect(checkout?.limiter.limit).toBeGreaterThan(
      email?.limiter.limit as number,
    );
  });

  // Someone re-downloading their own plan across devices is normal, so this
  // guards the endpoint rather than the token, which is 256 bits anyway.
  it("lets a paying customer re-download without being blocked", () => {
    const download = limiterConfigs.find(
      (c) => c.prefix === "ratelimit:download",
    );

    expect(download?.limiter.limit).toBeGreaterThanOrEqual(40);
  });

  it("bounds the Redis round-trip so a brownout can't stall the action", () => {
    for (const config of limiterConfigs) {
      expect(config.timeout).toBe(1000);
    }
  });
});

describe("checkRateLimit", () => {
  it("passes the key through and allows within the limit", async () => {
    limitMock.mockResolvedValueOnce({ success: true, reset: Date.now() });

    await expect(checkRateLimit("ip", "joinWaitlist:1.2.3.4")).resolves.toEqual(
      { success: true, retryAfter: 0 },
    );
    expect(limitMock).toHaveBeenCalledWith("joinWaitlist:1.2.3.4");
  });

  it("reports whole seconds until reset when blocked", async () => {
    vi.useFakeTimers();
    limitMock.mockResolvedValueOnce({
      success: false,
      reset: Date.now() + 30_000,
    });

    const result = await checkRateLimit("email", "joinWaitlist:a@b.com");
    vi.useRealTimers();

    expect(result.success).toBe(false);
    expect(result.retryAfter).toBe(30);
  });

  it("never tells the user to wait zero seconds", async () => {
    limitMock.mockResolvedValueOnce({
      success: false,
      reset: Date.now() - 5_000,
    });

    const result = await checkRateLimit("global", "all");

    expect(result.success).toBe(false);
    expect(result.retryAfter).toBe(1);
  });

  it("fails open when Upstash errors so an outage can't block signups", async () => {
    limitMock.mockRejectedValueOnce(new Error("redis unreachable"));

    await expect(checkRateLimit("global", "all")).resolves.toEqual({
      success: true,
      retryAfter: 0,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Rate-limit global check failed, allowing request",
      { error: "Error: redis unreachable" },
    );
  });
});
