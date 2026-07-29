import { CURRENCY, PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";

export const STRIPE_CURRENCY = "gbp";

export const LOOKUP_KEYS = {
  programme: "formula_programme_149",
  membership: "formula_membership_79",
} as const;

const toPence = (pounds: number) => pounds * 100;

export const PROGRAMME_AMOUNT_PENCE = toPence(PRICE_TODAY);
export const MEMBERSHIP_AMOUNT_PENCE = toPence(PRICE_MONTHLY);

export const CURRENCY_MATCHES_STRIPE = CURRENCY === "£";
