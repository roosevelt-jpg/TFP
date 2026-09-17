"use server";

import { tasks } from "@trigger.dev/sdk";
import { returnValidationErrors } from "next-safe-action";

import { trackServerEvent } from "@/lib/analytics-server";
import { enqueueWaitlistNurture } from "@/lib/funnel/enqueue";
import { recordConsent, recordFunnelEvent } from "@/lib/funnel/records";
import { logger } from "@/lib/logger";
import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanText } from "@/lib/sanitize/text";
import { verifyTurnstile } from "@/lib/turnstile";
import { waitlistSchema } from "@/lib/validation/waitlist/schema";
import { CONSENT_TEXT, POLICY_VERSION } from "@/lib/waitlist/consent";
import { clientIp, upsertWaitlistLead } from "@/lib/waitlist/persist";
import { env } from "@/env";
import type { sendWelcomeEmail } from "@/trigger/send-welcome-email";
import type { syncGhlContact } from "@/trigger/sync-ghl-contact";

export const joinWaitlist = actionClient
  .metadata({ actionName: "joinWaitlist" })
  .inputSchema(waitlistSchema)
  .action(async ({ parsedInput }) => {
    const ip = await clientIp();

    if (!(await verifyTurnstile(parsedInput.turnstileToken, ip, "join"))) {
      returnValidationErrors(waitlistSchema, {
        turnstileToken: { _errors: ["Verification failed. Please try again."] },
      });
    }

    const whatsapp = toE164(parsedInput.whatsapp);

    if (!whatsapp) {
      returnValidationErrors(waitlistSchema, {
        whatsapp: { _errors: ["Enter a valid mobile number"] },
      });
    }

    const { attribution } = parsedInput;
    const email = cleanEmail(parsedInput.email);
    const name = cleanText(parsedInput.name, 80);

    const lead = await upsertWaitlistLead(
      {
        name,
        email,
        whatsapp,
        goal: parsedInput.goal,
        level: parsedInput.level,
        sex: parsedInput.sex,
        age: parsedInput.age,
        heightCm: parsedInput.heightCm,
        weightKg: parsedInput.weightKg,
        goalWeightKg: parsedInput.goalWeightKg,
        diet: parsedInput.diet,
        injuries: parsedInput.injuries
          ? cleanText(parsedInput.injuries, 300)
          : undefined,
      },
      {
        consentAt: new Date(),
        consentText: CONSENT_TEXT,
        policyVersion: POLICY_VERSION,
        consentIp: await clientIp(),
        utmSource: attribution?.utmSource ?? null,
        utmMedium: attribution?.utmMedium ?? null,
        utmCampaign: attribution?.utmCampaign ?? null,
        utmContent: attribution?.utmContent ?? null,
        utmTerm: attribution?.utmTerm ?? null,
        fbclid: attribution?.fbclid ?? null,
        gclid: attribution?.gclid ?? null,
        referrer: attribution?.referrer ?? null,
        landingPath: attribution?.landingPath ?? null,
        attributionCapturedAt: attribution?.capturedAt
          ? new Date(attribution.capturedAt)
          : null,
      },
    );

    if (lead.isNew) {
      // Server twin of the client-side waitlist_joined (distinct names per
      // PostHog dedup guidance); isNew-gated so upsert retries don't recount.
      await trackServerEvent("lead_created", {
        ...(parsedInput.goal ? { goal: parsedInput.goal } : {}),
        ...(parsedInput.level ? { level: parsedInput.level } : {}),
        source: "server",
      });

      try {
        const { ensurePersonForWaitlist } = await import("@/lib/admin/clients");
        await ensurePersonForWaitlist(lead.id);
      } catch (error) {
        logger.warn("Could not create CRM person for waitlist lead", {
          waitlistId: lead.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await recordConsent({
        waitlistId: lead.id,
        channel: "email",
        purpose: "waitlist_updates",
        source: "join_form",
        policyVersion: POLICY_VERSION,
        ipAddress: await clientIp(),
      });
      await recordConsent({
        waitlistId: lead.id,
        channel: "whatsapp",
        purpose: "programme_delivery",
        source: "join_form",
        policyVersion: POLICY_VERSION,
        ipAddress: await clientIp(),
      });
      await recordFunnelEvent({
        eventName: "lead_submitted",
        waitlistId: lead.id,
        source: "web",
        properties: {
          goal: parsedInput.goal,
          level: parsedInput.level,
        },
        eventId: `lead:${lead.ref}`,
      });

      try {
        await tasks.trigger<typeof sendWelcomeEmail>(
          "send-welcome-email",
          { email, firstName: lead.firstName, ref: lead.ref },
          { idempotencyKey: lead.ref, idempotencyKeyTTL: "1h" },
        );
      } catch (error) {
        logger.error("Failed to enqueue welcome email", error);
      }

      await enqueueWaitlistNurture({
        waitlistId: lead.id,
        email,
        name,
      });

      if (env.GHL_SYNC_ENABLED) {
        try {
          await tasks.trigger<typeof syncGhlContact>(
            "sync-ghl-contact",
            {
              name,
              email,
              phone: whatsapp,
              ref: lead.ref,
              goal: parsedInput.goal,
              level: parsedInput.level,
              sex: parsedInput.sex,
              age: parsedInput.age,
              heightCm: parsedInput.heightCm,
              weightKg: parsedInput.weightKg,
              goalWeightKg: parsedInput.goalWeightKg,
              diet: parsedInput.diet,
              injuries: parsedInput.injuries
                ? cleanText(parsedInput.injuries, 300)
                : undefined,
            },
            { idempotencyKey: lead.ref, idempotencyKeyTTL: "1h" },
          );
        } catch (error) {
          logger.error("Failed to enqueue GHL contact sync", error);
        }
      }
    }

    return { ok: true as const, id: lead.publicToken, isNew: lead.isNew };
  });
