import "server-only";

import { env } from "@/env";
import { LAUNCH_PROMOTION_CODE } from "@/lib/pricing";
import { resolveSecret } from "@/lib/secrets/store";

export async function getFounderSeatsRemaining(): Promise<number | null> {
  if (!env.PAYMENTS_LIVE) return null;
  try {
    const key = await resolveSecret("STRIPE_SECRET_KEY");
    if (!key) return null;
    const res = await fetch(
      `https://api.stripe.com/v1/promotion_codes?code=${encodeURIComponent(LAUNCH_PROMOTION_CODE)}&limit=1`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ times_redeemed?: number; max_redemptions?: number | null }>;
    };
    const promo = json.data?.[0];
    if (!promo?.max_redemptions) return null;
    return Math.max(0, promo.max_redemptions - (promo.times_redeemed ?? 0));
  } catch {
    return null;
  }
}
