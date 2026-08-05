import { createLoader, parseAsString } from "nuqs/server";

export const successSearchParams = {
  session_id: parseAsString,
};

export const loadSuccessSearchParams = createLoader(successSearchParams);

export const checkoutSearchParams = {
  // Waitlist publicToken, present when the buyer arrived from a launch email.
  t: parseAsString,
  // Promo code carried from a landing-page CTA so the founder discount is
  // already filled in. Buyers can still clear or change it, and the server
  // re-validates it against Stripe either way.
  promo: parseAsString,
};

export const loadCheckoutSearchParams = createLoader(checkoutSearchParams);
