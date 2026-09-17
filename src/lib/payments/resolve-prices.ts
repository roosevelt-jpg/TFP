import "server-only";

import { getStripe } from "@/lib/clients/stripe";
import { AppError, ERROR_CODES } from "@/lib/errors/app-error";
import { LOOKUP_KEYS } from "@/lib/payments/prices";

// Price ids differ between test and live mode, so they're resolved by lookup_key
// at runtime rather than pinned in env. Cached per server instance: the catalog
// only changes when the bootstrap script runs.
let cached: { programmePriceId: string; membershipPriceId: string } | null =
  null;

export async function resolveProgrammePrices() {
  if (cached) return cached;

  const stripe = await getStripe();
  const { data } = await stripe.prices.list({
    lookup_keys: [LOOKUP_KEYS.programme, LOOKUP_KEYS.membership],
    active: true,
    limit: 2,
  });

  const programme = data.find(
    (price) => price.lookup_key === LOOKUP_KEYS.programme,
  );
  const membership = data.find(
    (price) => price.lookup_key === LOOKUP_KEYS.membership,
  );

  if (!programme || !membership) {
    // Means the catalog was never bootstrapped in this mode, or a price was
    // deactivated. Failing loudly beats charging the wrong amount.
    throw new AppError(
      ERROR_CODES.UNKNOWN,
      "Checkout is temporarily unavailable. Please try again shortly.",
    );
  }

  cached = {
    programmePriceId: programme.id,
    membershipPriceId: membership.id,
  };
  return cached;
}
