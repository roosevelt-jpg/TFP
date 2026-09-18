import "server-only";

import { env } from "@/env";
import { resolveSecret } from "@/lib/secrets/store";

export function whatsappWorkflowsEnabled() {
  return (
    env.WHATSAPP_WORKFLOWS_ENABLED === true ||
    String(env.WHATSAPP_WORKFLOWS_ENABLED) === "true"
  );
}

/** First-party purchase confirmation + activation WA (default on). Set false if GHL/Indigo must own purchase WA alone. */
export function whatsappPurchaseActivationEnabled() {
  return (
    env.WHATSAPP_SEND_PURCHASE_ACTIVATION === true ||
    String(env.WHATSAPP_SEND_PURCHASE_ACTIVATION) === "true"
  );
}

export async function resolveWhatsAppCredentials(): Promise<{
  token: string;
  phoneNumberId: string;
  businessAccountId: string | null;
} | null> {
  const [token, phoneNumberId, businessAccountId] = await Promise.all([
    resolveSecret("WHATSAPP_ACCESS_TOKEN"),
    resolveSecret("WHATSAPP_PHONE_NUMBER_ID"),
    resolveSecret("WHATSAPP_BUSINESS_ACCOUNT_ID"),
  ]);

  const tok = token ?? env.WHATSAPP_ACCESS_TOKEN;
  const phone = phoneNumberId ?? env.WHATSAPP_PHONE_NUMBER_ID;
  const waba = businessAccountId ?? env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? null;

  if (!tok || !phone) return null;
  return { token: tok, phoneNumberId: phone, businessAccountId: waba };
}

export async function isWhatsAppConfigured() {
  return (await resolveWhatsAppCredentials()) != null;
}
