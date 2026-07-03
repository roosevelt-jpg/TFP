"use server";

import { returnValidationErrors } from "next-safe-action";

import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanText } from "@/lib/sanitize/text";
import { waitlistSchema } from "@/lib/validation/waitlist/schema";
import { CONSENT_TEXT, POLICY_VERSION } from "@/lib/waitlist/consent";
import { clientIp, upsertWaitlistLead } from "@/lib/waitlist/persist";

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

    const id = await upsertWaitlistLead(
      {
        name: cleanText(parsedInput.name, 80),
        email: cleanEmail(parsedInput.email),
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

    // TODO(P3): enqueue welcome email (Resend) + GHL contact.
    return { ok: true as const, id };
  });
