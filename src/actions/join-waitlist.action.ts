"use server";

import { tasks } from "@trigger.dev/sdk";
import { returnValidationErrors } from "next-safe-action";

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
        goalWeightKg: parsedInput.goalWeightKg ?? null,
        diet: parsedInput.diet ?? null,
        injuries: parsedInput.injuries
          ? cleanText(parsedInput.injuries, 300)
          : null,
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
      },
    );

    if (lead.isNew) {
      try {
        await tasks.trigger<typeof sendWelcomeEmail>(
          "send-welcome-email",
          { email, firstName: lead.firstName, ref: lead.ref },
          { idempotencyKey: lead.ref, idempotencyKeyTTL: "1h" },
        );
      } catch (error) {
        logger.error("Failed to enqueue welcome email", error);
      }

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
              goalWeightKg: parsedInput.goalWeightKg ?? null,
              diet: parsedInput.diet ?? null,
              injuries: parsedInput.injuries
                ? cleanText(parsedInput.injuries, 300)
                : null,
            },
            { idempotencyKey: lead.ref, idempotencyKeyTTL: "1h" },
          );
        } catch (error) {
          logger.error("Failed to enqueue GHL contact sync", error);
        }
      }
    }

    return { ok: true as const, id: lead.publicToken };
  });
