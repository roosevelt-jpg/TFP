"use server";

import { tasks } from "@trigger.dev/sdk";
import { returnValidationErrors } from "next-safe-action";

import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanText } from "@/lib/sanitize/text";
import { waitlistSchema } from "@/lib/validation/waitlist/schema";
import { CONSENT_TEXT, POLICY_VERSION } from "@/lib/waitlist/consent";
import { clientIp, upsertWaitlistLead } from "@/lib/waitlist/persist";
import type { sendWelcomeEmail } from "@/trigger/send-welcome-email";

export const joinWaitlist = actionClient
  .metadata({ actionName: "joinWaitlist" })
  .inputSchema(waitlistSchema)
  .action(async ({ parsedInput }) => {
    const whatsapp = toE164(parsedInput.whatsapp);

    if (!whatsapp) {
      returnValidationErrors(waitlistSchema, {
        whatsapp: { _errors: ["Enter a valid mobile number"] },
      });
    }

    const { attribution } = parsedInput;
    const email = cleanEmail(parsedInput.email);

    const lead = await upsertWaitlistLead(
      {
        name: cleanText(parsedInput.name, 80),
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
        // Set only when a new lead is inserted (returning emails keep these).
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

    // Fire-and-forget, once per lead. A Trigger outage must not fail the
    // signup — the lead is already persisted. The idempotency key only guards
    // a double-submit of this same request (long-term once-per-lead is the
    // isNew gate), so a short TTL is enough.
    // TODO(P3): enqueue GHL contact upsert.
    if (lead.isNew) {
      try {
        await tasks.trigger<typeof sendWelcomeEmail>(
          "send-welcome-email",
          { email, firstName: lead.firstName, ref: lead.ref },
          { idempotencyKey: lead.ref, idempotencyKeyTTL: "1h" },
        );
      } catch (error) {
        // A failed enqueue creates no run, so it won't show in the Trigger
        // dashboard — log it here or the welcome email vanishes silently.
        console.error("[joinWaitlist] failed to enqueue welcome email:", error);
      }
    }

    return { ok: true as const, id: lead.publicToken };
  });
