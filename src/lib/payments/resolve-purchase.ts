import "server-only";

import { findPaidPurchaseBySession } from "@/data/payments/queries/find-purchase-by-session";

import { confirmCheckout } from "./confirm-checkout";
import { isWithinOnboardingWindow } from "./onboarding-window";

export type ResolvedPurchase = {
  customerId: string;
  ref: string;
  stripeCustomerId: string;
};

// Authenticates a session id against a paid purchase. Usually one indexed read;
// only if the row is genuinely absent does it fall back to Stripe, which also
// fulfils — a slow webhook shouldn't be why someone's answers have nowhere to go.
//
// The age check runs on both paths: a session id lives in browser history
// forever, and it is the only credential guarding someone's coaching answers.
export async function resolvePaidPurchase(
  sessionId: string,
): Promise<ResolvedPurchase | null> {
  const existing = await findPaidPurchaseBySession(sessionId);
  if (existing) {
    return isWithinOnboardingWindow(existing.purchasedAt) ? existing : null;
  }

  const confirmed = await confirmCheckout(sessionId);
  if (confirmed.state !== "paid") return null;

  // Fulfillment has just written the row, so this read resolves the fields
  // confirmCheckout doesn't carry.
  return findPaidPurchaseBySession(sessionId);
}
