import "server-only";

import { getStripe } from "@/lib/clients/stripe";
import { logger } from "@/lib/logger";
import { LAUNCH_PROMOTION_CODE, LAUNCH_PROMOTION_LIMIT } from "@/lib/pricing";

export const PROMO_WINDOW_HOURS = 24;

const PROGRAMME_COUPON_ID = "formula_programme_50";

// Opens the launch offer for a fixed window, at the moment the blast goes out
// rather than whenever the catalog was provisioned: the clock has to start when
// people are told, not before.
//
// Stripe makes expires_at immutable, so a dated code cannot be edited into
// existence — the undated one is deactivated and a dated one takes its place.
// The point is that Stripe enforces the deadline, so what the email promises is
// exactly what Checkout applies, with nothing to remember to switch off.
export async function openPromoWindow(): Promise<Date | null> {
  const stripe = await getStripe();
  const { data } = await stripe.promotionCodes.list({
    code: LAUNCH_PROMOTION_CODE,
    limit: 1,
    active: true,
  });
  const [existing] = data;

  // Already dated, so this is a re-run after a partial failure. Reusing the
  // original deadline stops the stragglers getting a fresh 24 hours the first
  // recipients never had.
  if (existing?.expires_at) {
    return new Date(existing.expires_at * 1000);
  }

  const expiresAt = new Date(Date.now() + PROMO_WINDOW_HOURS * 60 * 60 * 1000);

  // Deactivated first: Stripe refuses a second active code with the same string,
  // so the new one cannot be created while this exists.
  if (existing) {
    await stripe.promotionCodes.update(existing.id, { active: false });
  }

  const created = await stripe.promotionCodes.create({
    code: LAUNCH_PROMOTION_CODE,
    promotion: { type: "coupon", coupon: PROGRAMME_COUPON_ID },
    max_redemptions: LAUNCH_PROMOTION_LIMIT,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
  });

  logger.info("Launch promo window opened", {
    promotionCodeId: created.id,
    code: LAUNCH_PROMOTION_CODE,
    expiresAt,
    replaced: existing?.id ?? null,
    // Redemptions restart with the new code, so a partially used offer would
    // quietly regain its allowance. Worth seeing in the log if it happens.
    previousRedemptions: existing?.times_redeemed ?? 0,
  });

  return expiresAt;
}
