"use server";

import { returnValidationErrors } from "next-safe-action";

import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanText } from "@/lib/sanitize/text";
import { waitlistSchema } from "@/lib/validation/waitlist/schema";
import { encodeConfirmationToken } from "@/lib/waitlist/confirmation-token";

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

    const lead = {
      name: cleanText(parsedInput.name, 80),
      email: cleanEmail(parsedInput.email),
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
        : parsedInput.injuries,
    };

    // STUB persistence — real Supabase upsert (idempotent on email) + Trigger
    // enqueue (welcome email, GHL contact) land in P3, returning the row id.
    const ref = `WL-${lead.email.slice(0, 3).toUpperCase()}${Date.now().toString(36).slice(-5).toUpperCase()}`;
    console.info("[waitlist] lead captured (stub):", { ...lead, ref });

    const id = encodeConfirmationToken({
      ref,
      firstName: lead.name.split(" ")[0] || undefined,
    });

    return { ok: true as const, id };
  });
