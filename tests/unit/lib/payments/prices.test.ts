import { describe, expect, it } from "vitest";

import {
  CURRENCY_MATCHES_STRIPE,
  LOOKUP_KEYS,
  MEMBERSHIP_AMOUNT_PENCE,
  PROGRAMME_AMOUNT_PENCE,
  STRIPE_CURRENCY,
} from "@/lib/payments/prices";
import {
  CURRENCY,
  PRICE_MONTHLY,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
  TRIAL_DAYS,
} from "@/lib/pricing";

// Stripe Prices are immutable: changing an amount means creating a new Price and
// re-pointing the lookup_key. So a pricing.ts edit that isn't followed by a
// bootstrap run leaves the site advertising one figure while Stripe charges
// another. These assertions are the tripwire for that.
describe("payment amounts stay in sync with advertised pricing", () => {
  it("converts the advertised prices to pence exactly", () => {
    expect(PROGRAMME_AMOUNT_PENCE).toBe(14900);
    expect(MEMBERSHIP_AMOUNT_PENCE).toBe(7900);
  });

  it("derives pence from pricing.ts rather than duplicating the figures", () => {
    expect(PROGRAMME_AMOUNT_PENCE).toBe(PRICE_TODAY * 100);
    expect(MEMBERSHIP_AMOUNT_PENCE).toBe(PRICE_MONTHLY * 100);
  });

  it("keeps amounts as whole pence", () => {
    expect(Number.isInteger(PROGRAMME_AMOUNT_PENCE)).toBe(true);
    expect(Number.isInteger(MEMBERSHIP_AMOUNT_PENCE)).toBe(true);
  });

  it("charges in the currency the site advertises", () => {
    expect(CURRENCY).toBe("£");
    expect(STRIPE_CURRENCY).toBe("gbp");
    expect(CURRENCY_MATCHES_STRIPE).toBe(true);
  });
});

describe("trial length matches the advertised programme length", () => {
  it("defers the first membership charge to the end of the programme", () => {
    expect(PROGRAMME_WEEKS).toBe(8);
    expect(TRIAL_DAYS).toBe(56);
    expect(TRIAL_DAYS).toBe(PROGRAMME_WEEKS * 7);
  });
});

describe("lookup keys", () => {
  it("are distinct so the two line items can't collide", () => {
    expect(LOOKUP_KEYS.programme).not.toBe(LOOKUP_KEYS.membership);
  });

  // The bootstrap script and the Checkout builder both resolve prices by these
  // strings, so a rename in one place without the other silently breaks
  // checkout. Pinning the literals makes that a failing test, not a 500.
  it("are pinned literals", () => {
    expect(LOOKUP_KEYS.programme).toBe("formula_programme_149");
    expect(LOOKUP_KEYS.membership).toBe("formula_membership_79");
  });
});
