import { createLoader, parseAsString } from "nuqs/server";

export const successSearchParams = {
  session_id: parseAsString,
};

export const loadSuccessSearchParams = createLoader(successSearchParams);

export const checkoutSearchParams = {
  // Waitlist publicToken, present when the buyer arrived from a launch email.
  t: parseAsString,
};

export const loadCheckoutSearchParams = createLoader(checkoutSearchParams);
