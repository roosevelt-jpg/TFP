"use server";

import { returnValidationErrors } from "next-safe-action";

import { checkHoneypot } from "@/lib/abuse/honeypot";
import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanText } from "@/lib/sanitize/text";
import { waitlistSchema } from "@/lib/validation/waitlist/schema";

export const joinWaitlist = actionClient
  .metadata({ actionName: "joinWaitlist" })
  .inputSchema(waitlistSchema)
  .action(async ({ parsedInput }) => {
    const spam = checkHoneypot(parsedInput.honeypot, parsedInput.renderedAt);

    if (spam) {
      console.warn("[waitlist] rejected:", spam);
      // Passive: pretend success so bots get no signal. P4 hard-blocks.
      return { ok: true as const, ref: "WL-QUEUED" };
    }

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
    // enqueue (welcome email, GHL contact) land in P3.
    const ref = `WL-${lead.email.slice(0, 3).toUpperCase()}${Date.now().toString(36).slice(-5).toUpperCase()}`;
    console.info("[waitlist] lead captured (stub):", { ...lead, ref });

    return { ok: true as const, ref };
  });
