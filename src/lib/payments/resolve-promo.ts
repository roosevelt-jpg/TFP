import "server-only";

import { stripe } from "@/lib/clients/stripe";
import { logger } from "@/lib/logger";

export type PromoLookup =
  // Stripe recognised it and it is redeemable right now.
  | { state: "valid"; promotionCodeId: string }
  // Wrong, expired, exhausted or deactivated. Deliberately one state: telling a
  // stranger which of those it is turns the field into a code oracle.
  | { state: "invalid" }
  // Stripe could not answer. Distinct from invalid because rejecting a good
  // code during an outage costs a sale.
  | { state: "unavailable" };

// Step one of Stripe's documented flow for codes collected on your own page:
// list promotion codes filtered by the string the customer typed, then pass the
// resolved id into `discounts` on the session.
//
// active: true does most of the validation for us — Stripe flips a code
// inactive once it expires or hits max_redemptions, so an exhausted code simply
// stops matching.
export async function resolvePromotionCode(code: string): Promise<PromoLookup> {
  const trimmed = code.trim();

  if (!trimmed) return { state: "invalid" };

  try {
    const { data } = await stripe.promotionCodes.list({
      code: trimmed,
      active: true,
      limit: 1,
    });

    const [promo] = data;

    if (!promo) {
      logger.info("Promotion code not recognised", { code: trimmed });
      return { state: "invalid" };
    }

    // active covers expiry and redemption limits, but the parent coupon can be
    // deleted independently, which leaves the code active and useless.
    const coupon =
      typeof promo.promotion === "object" ? promo.promotion.coupon : null;

    if (coupon && typeof coupon === "object" && coupon.valid === false) {
      logger.info("Promotion code has an invalid coupon", { code: trimmed });
      return { state: "invalid" };
    }

    return { state: "valid", promotionCodeId: promo.id };
  } catch (error) {
    // Never fail the sale over a lookup: the caller falls back to Stripe's own
    // promo field so the buyer can still enter it there.
    logger.error("Could not check a promotion code", error, { code: trimmed });
    return { state: "unavailable" };
  }
}
