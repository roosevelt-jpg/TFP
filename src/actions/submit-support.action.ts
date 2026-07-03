"use server";

import { firstNameOf } from "@/lib/name";
import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanText } from "@/lib/sanitize/text";
import { SUPPORT_TYPE_OPTIONS } from "@/lib/validation/support/options";
import { supportSchema } from "@/lib/validation/support/schema";

export const submitSupport = actionClient
  .metadata({ actionName: "submitSupport" })
  .inputSchema(supportSchema)
  .action(async ({ parsedInput }) => {
    const option = SUPPORT_TYPE_OPTIONS.find(
      (o) => o.value === parsedInput.type,
    );

    const request = {
      name: cleanText(parsedInput.name, 80),
      email: cleanEmail(parsedInput.email),
      type: parsedInput.type,
      whatsapp: parsedInput.whatsapp ? toE164(parsedInput.whatsapp) : null,
      message: parsedInput.message
        ? cleanText(parsedInput.message, 2000)
        : null,
    };

    // STUB — real Resend notification + ticket land in P3.
    console.info("[support] request captured (stub):", request);

    return {
      firstName: firstNameOf(request.name) || request.name,
      email: request.email,
      typeLabel: option?.logged ?? "support",
      isCancel: parsedInput.type === "cancel",
    };
  });
