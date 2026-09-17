import "server-only";

import { resolvePromotionCode } from "@/lib/payments/resolve-promo";
import {
  CURRENCY,
  FOUNDER_PRICE_TODAY,
  LAUNCH_PROMOTION_CODE,
  PRICE_MONTHLY,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
  TRIAL_DAYS,
  formatGbpAmount,
  gbp,
  rolloverDisclosure,
} from "@/lib/pricing";

export type PromoState =
  | "valid"
  | "invalid"
  | "none"
  | "unavailable";

/** Public, browser-safe offer snapshot. Never includes Stripe secrets. */
export type ResolvedOffer = {
  id: string;
  programmeName: string;
  currency: "GBP";
  currencySymbol: typeof CURRENCY;
  standardAmount: number;
  amountDueToday: number;
  renewalAmount: number;
  renewalStartsAfterDays: number;
  programmeWeeks: number;
  promotionCode: string | null;
  promoState: PromoState;
  /** True when the founder half-off is active on this resolution. */
  founderActive: boolean;
  amountDueTodayLabel: string;
  standardAmountLabel: string;
  renewalAmountLabel: string;
  renewalDisclosure: string;
};

const OFFER_ID = "formula-programme-v1";

function buildOffer(input: {
  amountDueToday: number;
  promotionCode: string | null;
  promoState: PromoState;
}): ResolvedOffer {
  return {
    id: OFFER_ID,
    programmeName: "The Formula Programme",
    currency: "GBP",
    currencySymbol: CURRENCY,
    standardAmount: PRICE_TODAY,
    amountDueToday: input.amountDueToday,
    renewalAmount: PRICE_MONTHLY,
    renewalStartsAfterDays: TRIAL_DAYS,
    programmeWeeks: PROGRAMME_WEEKS,
    promotionCode: input.promotionCode,
    promoState: input.promoState,
    founderActive:
      input.promoState === "valid" &&
      input.amountDueToday === FOUNDER_PRICE_TODAY,
    amountDueTodayLabel: gbp(input.amountDueToday),
    standardAmountLabel: gbp(PRICE_TODAY),
    renewalAmountLabel: gbp(PRICE_MONTHLY),
    renewalDisclosure: rolloverDisclosure(input.amountDueToday),
  };
}

/**
 * Server-authoritative offer. URL/query may select a promo; they never set the
 * charged amount. Stripe remains the final gate at session creation.
 */
export async function resolveOffer(
  promotionCode?: string | null,
): Promise<ResolvedOffer> {
  const trimmed = promotionCode?.trim() || null;

  if (!trimmed) {
    return buildOffer({
      amountDueToday: PRICE_TODAY,
      promotionCode: null,
      promoState: "none",
    });
  }

  const lookup = await resolvePromotionCode(trimmed);

  if (lookup.state === "valid") {
    const isFounder =
      trimmed.toUpperCase() === LAUNCH_PROMOTION_CODE.toUpperCase();
    return buildOffer({
      amountDueToday: isFounder ? FOUNDER_PRICE_TODAY : PRICE_TODAY,
      promotionCode: trimmed.toUpperCase(),
      promoState: "valid",
    });
  }

  if (lookup.state === "unavailable") {
    // Don't advertise a discount we couldn't verify; checkout can still try.
    return buildOffer({
      amountDueToday: PRICE_TODAY,
      promotionCode: trimmed.toUpperCase(),
      promoState: "unavailable",
    });
  }

  return buildOffer({
    amountDueToday: PRICE_TODAY,
    promotionCode: trimmed.toUpperCase(),
    promoState: "invalid",
  });
}

/** Landing / live CTAs: try the public founder code when payments are live. */
export async function resolvePublicOffer(paymentsLive: boolean): Promise<ResolvedOffer> {
  if (!paymentsLive) {
    return resolveOffer(null);
  }
  return resolveOffer(LAUNCH_PROMOTION_CODE);
}

export function formatOfferPence(pence: number): string {
  return formatGbpAmount(pence / 100);
}
