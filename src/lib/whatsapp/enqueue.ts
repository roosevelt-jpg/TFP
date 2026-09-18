import "server-only";

import { tasks } from "@trigger.dev/sdk";

import { logger } from "@/lib/logger";
import {
  whatsappPurchaseActivationEnabled,
  whatsappWorkflowsEnabled,
} from "@/lib/whatsapp/config";
import { resolveCrmWhatsAppNumber } from "@/lib/whatsapp/resolve-recipient";
import type { WhatsAppTemplateKey } from "@/lib/whatsapp/templates";
import type { sendWhatsAppMessage } from "@/trigger/send-whatsapp-message";

export async function enqueueWhatsAppTemplate(input: {
  toE164?: string;
  customerId?: string;
  waitlistId?: string;
  templateKey: WhatsAppTemplateKey | string;
  firstName?: string;
  purpose: "transactional" | "lifecycle" | "marketing";
  idempotencyKey: string;
  delay?: string;
  /** Dynamic URL button suffixes (Meta template button index 0..n). */
  buttonUrlParams?: string[];
}) {
  if (!whatsappWorkflowsEnabled()) return { skipped: "flag_off" as const };

  const toE164 = await resolveCrmWhatsAppNumber({
    customerId: input.customerId,
    waitlistId: input.waitlistId,
    fallbackE164: input.toE164,
  });
  if (!toE164) return { skipped: "no_phone" as const };

  try {
    await tasks.trigger<typeof sendWhatsAppMessage>(
      "send-whatsapp-message",
      {
        toE164,
        templateKey: input.templateKey,
        bodyParams: input.firstName ? [input.firstName] : [],
        buttonUrlParams: input.buttonUrlParams ?? [],
        customerId: input.customerId,
        waitlistId: input.waitlistId,
        purpose: input.purpose,
      },
      {
        idempotencyKey: input.idempotencyKey,
        idempotencyKeyTTL: "14d",
        delay: input.delay,
        queue: "whatsapp",
      },
    );
    return { ok: true as const, toE164 };
  } catch (error) {
    logger.error("Could not enqueue WhatsApp message", error, {
      templateKey: input.templateKey,
      idempotencyKey: input.idempotencyKey,
    });
    return { skipped: "enqueue_failed" as const };
  }
}

export async function enqueueWaitlistWhatsAppWelcome(input: {
  waitlistId: string;
  whatsapp: string;
  firstName: string;
}) {
  return enqueueWhatsAppTemplate({
    toE164: input.whatsapp,
    templateKey: "waitlist_welcome",
    firstName: input.firstName,
    waitlistId: input.waitlistId,
    purpose: "lifecycle",
    idempotencyKey: `wa:waitlist-welcome:${input.waitlistId}`,
  });
}

export async function enqueuePurchaseWhatsAppActivation(input: {
  customerId: string;
  purchaseRef: string;
  whatsapp?: string;
  firstName: string;
}) {
  if (!whatsappPurchaseActivationEnabled()) {
    return { skipped: "purchase_wa_off" as const };
  }

  // Confirmation first (Trendyol-style order received), then activation CTA.
  await enqueueWhatsAppTemplate({
    toE164: input.whatsapp,
    templateKey: "purchase_confirmation",
    firstName: input.firstName,
    customerId: input.customerId,
    purpose: "transactional",
    idempotencyKey: `wa:purchase-confirmation:${input.purchaseRef}`,
    buttonUrlParams: [input.purchaseRef],
  });

  return enqueueWhatsAppTemplate({
    toE164: input.whatsapp,
    templateKey: "purchase_activation",
    firstName: input.firstName,
    customerId: input.customerId,
    purpose: "transactional",
    idempotencyKey: `wa:purchase-activation:${input.purchaseRef}`,
    buttonUrlParams: [input.purchaseRef],
  });
}

export async function enqueueServiceRegisteredWhatsApp(input: {
  toE164?: string;
  firstName: string;
  customerId?: string;
  waitlistId?: string;
  serviceKey: string;
}) {
  return enqueueWhatsAppTemplate({
    toE164: input.toE164,
    templateKey: "service_registered",
    firstName: input.firstName,
    customerId: input.customerId,
    waitlistId: input.waitlistId,
    purpose: "transactional",
    idempotencyKey: `wa:service-registered:${input.serviceKey}`,
  });
}

export async function enqueueActivationReminderWhatsApp(input: {
  customerId: string;
  purchaseRef: string;
  whatsapp?: string;
  firstName: string;
}) {
  return enqueueWhatsAppTemplate({
    toE164: input.whatsapp,
    templateKey: "activation_reminder",
    firstName: input.firstName,
    customerId: input.customerId,
    purpose: "transactional",
    idempotencyKey: `wa:activation-reminder:${input.purchaseRef}:24h`,
    buttonUrlParams: [input.purchaseRef],
  });
}
