import "server-only";

import { toE164 } from "@/lib/sanitize/phone";
import { db } from "@/db";

/**
 * Resolve the CRM WhatsApp number for a customer / waitlist lead.
 * Automation must only send to this normalised E.164 — never raw form junk.
 */
export async function resolveCrmWhatsAppNumber(input: {
  customerId?: string;
  waitlistId?: string;
  /** Explicit override (already collected at trigger site). */
  fallbackE164?: string | null;
}): Promise<string | null> {
  if (input.customerId) {
    const customer = await db.customer.findUnique({
      where: { id: input.customerId },
      select: { whatsapp: true },
    });
    const normalised = customer?.whatsapp
      ? toE164(customer.whatsapp)
      : null;
    if (normalised) return normalised;
  }

  if (input.waitlistId) {
    const lead = await db.waitlist.findUnique({
      where: { id: input.waitlistId },
      select: { whatsapp: true },
    });
    const normalised = lead?.whatsapp ? toE164(lead.whatsapp) : null;
    if (normalised) return normalised;
  }

  if (input.fallbackE164) {
    return toE164(input.fallbackE164);
  }

  return null;
}
