// Single source of truth for pricing. Never hard-code these figures elsewhere.
export const PRICE_TODAY = 149;
export const PRICE_MONTHLY = 79;
export const CURRENCY = "£";

// Weeks of programme covered by PRICE_TODAY, after which the membership starts.
// Implemented in Stripe as the subscription's trial length, so the £149 is
// charged up front and the first £79 lands the day the programme ends.
export const PROGRAMME_WEEKS = 8;
export const TRIAL_DAYS = PROGRAMME_WEEKS * 7;

export const ROLLOVER_DISCLOSURE = `${CURRENCY}${PRICE_TODAY} today for the ${PROGRAMME_WEEKS}-week programme, then ${CURRENCY}${PRICE_MONTHLY} a month. Cancel anytime.`;

// The launch offer: half off the programme fee for the first 50 buyers, once
// only, and not the monthly membership. Mirrored in stripe-bootstrap, which
// creates the coupon — the launch email promises these exact terms, so the two
// must not drift.
export const LAUNCH_PROMOTION_CODE = "FORMULA50";
export const LAUNCH_PROMOTION_LIMIT = 50;
