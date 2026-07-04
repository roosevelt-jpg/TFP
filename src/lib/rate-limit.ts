import "server-only";

import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "@/lib/clients/redis";
import { logger } from "@/lib/logger";

// Layered limits for the public forms (see the P4a design):
//   global — total backstop so a flood can't overwhelm the DB/Trigger/Resend
//   ip     — one machine hammering a form
//   email  — one address retried across IPs
const TIERS = {
  global: { limit: 5000, window: "1 m" },
  ip: { limit: 5, window: "1 m" },
  email: { limit: 3, window: "1 m" },
} as const;

export type RateLimitTier = keyof typeof TIERS;

const ephemeralCache = new Map<string, number>();

function build(tier: RateLimitTier): Ratelimit {
  const { limit, window } = TIERS[tier];
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    ephemeralCache,
    analytics: true,
    timeout: 1000,
    prefix: `ratelimit:${tier}`,
  });
}

const limiters: Record<RateLimitTier, Ratelimit> = {
  global: build("global"),
  ip: build("ip"),
  email: build("email"),
};

export type RateLimitResult = {
  success: boolean;
  retryAfter: number;
};

export async function checkRateLimit(
  tier: RateLimitTier,
  key: string,
): Promise<RateLimitResult> {
  try {
    const { success, reset } = await limiters[tier].limit(key);
    return {
      success,
      retryAfter: success
        ? 0
        : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    logger.warn(`Rate-limit ${tier} check failed, allowing request`, {
      error: String(error),
    });
    return { success: true, retryAfter: 0 };
  }
}
