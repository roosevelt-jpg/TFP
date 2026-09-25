import { LAUNCH_PROMOTION_CODE } from "@/lib/pricing";

// Single switch for pre-launch (waitlist) vs. live (payments running) behaviour.
// Set PAYMENTS_LIVE=true (env) when billing goes live to surface the membership
// support flows (billing, pause, cancel, refund) and their payment-timing copy.
//
// Read from process.env (not @/env) so client CTA modules never pull the full
// Zod env schema into the browser bundle. Compared explicitly: the string
// "false" must not open the payments gate.
export const PAYMENTS_LIVE =
  process.env.PAYMENTS_LIVE === "true" ||
  process.env.NEXT_PUBLIC_PAYMENTS_LIVE === "true";

// Where "start / finish signing up" CTAs point: the waitlist form pre-launch,
// the paid checkout once payments are live. Keeps label and destination in sync.
// Live CTAs carry the founder promo so the discount is already in the form: the
// offer is public now, and a buyer who never sees the code still gets it.
// Stripe remains the authority — it caps redemptions at 50 and rejects the code
// once they are gone, so the link can't over-promise.
//
// Prefer server PAYMENTS_LIVE; NEXT_PUBLIC_PAYMENTS_LIVE lets client CTAs match
// when the public flag is intentionally set for launch.
export const SIGNUP_HREF = PAYMENTS_LIVE
  ? `/checkout?promo=${LAUNCH_PROMOTION_CODE}`
  : "/join";
