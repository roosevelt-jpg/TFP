import { env } from "@/env";

// Single switch for pre-launch (waitlist) vs. live (payments running) behaviour.
// Set PAYMENTS_LIVE=true (env) when billing goes live to surface the membership
// support flows (billing, pause, cancel, refund) and their payment-timing copy.
export const PAYMENTS_LIVE = env.PAYMENTS_LIVE;

// Where "start / finish signing up" CTAs point: the waitlist form pre-launch,
// the paid checkout once payments are live. Keeps label and destination in sync.
export const SIGNUP_HREF = PAYMENTS_LIVE ? "/checkout" : "/join";
