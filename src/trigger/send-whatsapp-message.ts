import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import {
  assertChannelEligible,
  isChannelEligibilityError,
} from "@/lib/funnel/eligibility";
import {
  linkChannelIdentity,
  logOutboundMessage,
} from "@/lib/funnel/records";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import {
  isWhatsAppConfigured,
  whatsappWorkflowsEnabled,
} from "@/lib/whatsapp/config";
import { whatsappQueue } from "@/trigger/queues";

export const sendWhatsAppMessage = schemaTask({
  id: "send-whatsapp-message",
  schema: z.object({
    toE164: z.string().min(7).max(40),
    templateKey: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9_]+$/i),
    bodyParams: z.array(z.string().max(120)).max(5).default([]),
    buttonUrlParams: z.array(z.string().max(200)).max(3).default([]),
    customerId: z.string().optional(),
    waitlistId: z.string().optional(),
    purpose: z.enum(["transactional", "lifecycle", "marketing"]),
  }),
  queue: whatsappQueue,
  retry: { maxAttempts: 4 },
  maxDuration: 45,
  run: async (payload) => {
    if (!whatsappWorkflowsEnabled()) {
      return { skipped: "flag_off" as const };
    }
    if (!(await isWhatsAppConfigured())) {
      return { skipped: "no_credentials" as const };
    }

    try {
      await assertChannelEligible({
        channel: "whatsapp",
        customerId: payload.customerId,
        waitlistId: payload.waitlistId,
        purpose: payload.purpose,
      });
    } catch (error) {
      if (isChannelEligibilityError(error)) {
        await logOutboundMessage({
          customerId: payload.customerId,
          waitlistId: payload.waitlistId,
          channel: "whatsapp",
          templateId: payload.templateKey,
          status: "suppressed",
          failureReason: error instanceof Error ? error.message : "ineligible",
        });
        return { skipped: "ineligible" as const };
      }
      throw error;
    }

    const result = await sendWhatsAppTemplate({
      toE164: payload.toE164,
      templateKey: payload.templateKey,
      bodyParams: payload.bodyParams,
      buttonUrlParams: payload.buttonUrlParams,
    });

    if (!result.ok) {
      await logOutboundMessage({
        customerId: payload.customerId,
        waitlistId: payload.waitlistId,
        channel: "whatsapp",
        templateId: payload.templateKey,
        status: "failed",
        failureReason: result.detail ?? result.reason,
      });
      if (
        result.reason === "no_credentials" ||
        result.reason === "flag_off" ||
        result.reason === "template_disabled"
      ) {
        return { skipped: result.reason };
      }
      throw new AbortTaskRunError(
        result.detail ?? `WhatsApp send failed: ${result.reason}`,
      );
    }

    await linkChannelIdentity({
      channel: "whatsapp",
      externalUserId: payload.toE164.replace(/\D/g, ""),
      customerId: payload.customerId,
      waitlistId: payload.waitlistId,
      address: payload.toE164,
      inbound: false,
    });

    await logOutboundMessage({
      customerId: payload.customerId,
      waitlistId: payload.waitlistId,
      channel: "whatsapp",
      templateId: payload.templateKey,
      templateVersion: result.templateVersion,
      providerMessageId: result.messageId,
      status: "sent",
    });

    logger.info("WhatsApp template sent", {
      templateKey: payload.templateKey,
      metaName: result.metaName,
      templateVersion: result.templateVersion,
      messageId: result.messageId,
    });

    return { ok: true as const, messageId: result.messageId };
  },
});
