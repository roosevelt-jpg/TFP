import "server-only";

import { env } from "@/env";

function enabled(value: boolean | undefined, fallback: boolean) {
  if (value === true) return true;
  if (value === false) return false;
  return fallback;
}

/**
 * Spec §16.2 kill switches. Each family can be turned off without taking
 * checkout offline. Defaults keep the current product on; AI coaching stays
 * off until that flag is explicitly set.
 */
export const funnelFlags = {
  funnelV2: () => enabled(env.FUNNEL_V2_ENABLED, true),
  serverOffer: () => enabled(env.SERVER_OFFER_RESOLUTION_ENABLED, true),
  leadCapture: () => enabled(env.LEAD_CAPTURE_ENABLED, true),
  checkoutRecovery: () => enabled(env.CHECKOUT_RECOVERY_ENABLED, true),
  whatsapp: () => enabled(env.WHATSAPP_WORKFLOWS_ENABLED, true),
  telegram: () => enabled(env.TELEGRAM_ACTIVATION_ENABLED, true),
  instagram: () => enabled(env.INSTAGRAM_INBOUND_ENABLED, true),
  aiCoaching: () => enabled(env.AI_COACHING_RESPONSES_ENABLED, false),
};
