import "server-only";

import Stripe from "stripe";

import { resolveSecret } from "@/lib/secrets/store";

const stripeOptions = {
  apiVersion: Stripe.API_VERSION,
  maxNetworkRetries: 3,
  // A hung socket would otherwise sit in the buyer's redirect path.
  timeout: 15_000,
  appInfo: { name: "the-formula-programme" },
} as const;

type StripeCache = { key: string; client: Stripe };

const globalForStripe = globalThis as unknown as {
  stripeCache?: StripeCache;
};

export async function getStripeSecretKey(): Promise<string> {
  const key = await resolveSecret("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return key;
}

export async function getStripeWebhookSecret(): Promise<string> {
  const secret = await resolveSecret("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }
  return secret;
}

/** Stripe SDK client — prefers encrypted DB secret, then env. */
export async function getStripe(): Promise<Stripe> {
  const key = await getStripeSecretKey();
  const cached = globalForStripe.stripeCache;
  if (cached?.key === key) return cached.client;

  const client = new Stripe(key, stripeOptions);
  globalForStripe.stripeCache = { key, client };
  return client;
}

/** Which dataset our key writes to. Distinct from PAYMENTS_LIVE. */
export async function stripeKeyIsLive(): Promise<boolean> {
  const key = await getStripeSecretKey();
  return key.includes("_live_");
}
