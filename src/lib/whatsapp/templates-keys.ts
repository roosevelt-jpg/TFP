/** Client-safe list of wired WhatsApp template keys (no DB / env). */
export const WHATSAPP_TEMPLATE_KEYS = [
  "waitlist_welcome",
  "checkout_recovery",
  "purchase_confirmation",
  "purchase_activation",
  "activation_reminder",
  "service_registered",
] as const;

export type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export function isWhatsAppTemplateKey(
  value: string,
): value is WhatsAppTemplateKey {
  return (WHATSAPP_TEMPLATE_KEYS as readonly string[]).includes(value);
}
