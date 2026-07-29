import "server-only";

import Stripe from "stripe";

import { env } from "@/env";

// Which dataset our key writes to. Distinct from PAYMENTS_LIVE, which only
// controls whether the checkout routes are publicly reachable.
export const STRIPE_KEY_IS_LIVE = env.STRIPE_SECRET_KEY.includes("_live_");

const globalForStripe = globalThis as unknown as { stripe?: Stripe };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: Stripe.API_VERSION,
    maxNetworkRetries: 3,
    // A hung socket would otherwise sit in the buyer's redirect path.
    timeout: 15_000,
    appInfo: { name: "the-formula-programme" },
  });

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;
