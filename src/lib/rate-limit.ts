import "server-only";

import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "@/lib/clients/redis";

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

// Fail open on a runtime Redis error: a blip must not block signups. Config is
// required (see env), so this only covers Redis being unreachable mid-request.
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
    console.error(`[rate-limit] ${tier} check failed (allowing):`, error);
    return { success: true, retryAfter: 0 };
  }
}
