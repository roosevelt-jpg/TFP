import { LAUNCH_PROMOTION_CODE } from "@/lib/pricing";
import { env } from "@/env";

// Single switch for pre-launch (waitlist) vs. live (payments running) behaviour.
// Set PAYMENTS_LIVE=true (env) when billing goes live to surface the membership
// support flows (billing, pause, cancel, refund) and their payment-timing copy.
//
// Compared explicitly rather than trusted as a boolean: when SKIP_ENV_VALIDATION
// bypasses the schema (CI), env values arrive as raw strings, and the string
// "false" is truthy — a dangerous default for a payments gate. This keeps the
// gate closed unless the value is genuinely true.
export const PAYMENTS_LIVE =
  env.PAYMENTS_LIVE === true || String(env.PAYMENTS_LIVE) === "true";

// Where "start / finish signing up" CTAs point: the waitlist form pre-launch,
// the paid checkout once payments are live. Keeps label and destination in sync.
// Live CTAs carry the founder promo so the discount is already in the form: the
// offer is public now, and a buyer who never sees the code still gets it.
// Stripe remains the authority — it caps redemptions at 50 and rejects the code
// once they are gone, so the link can't over-promise.
export const SIGNUP_HREF = PAYMENTS_LIVE
  ? `/checkout?promo=${LAUNCH_PROMOTION_CODE}`
  : "/join";
