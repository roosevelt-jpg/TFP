"use server";

import { tasks } from "@trigger.dev/sdk";

import { logger } from "@/lib/logger";
import { firstNameOf } from "@/lib/name";
import { actionClient } from "@/lib/safe-action";
import { cleanEmail } from "@/lib/sanitize/email";
import { toE164 } from "@/lib/sanitize/phone";
import { cleanMultiline, cleanText } from "@/lib/sanitize/text";
import { SUPPORT_TYPE_OPTIONS } from "@/lib/validation/support/options";
import { supportSchema } from "@/lib/validation/support/schema";
import type { sendSupportEmails } from "@/trigger/send-support-emails";

export const submitSupport = actionClient
  .metadata({ actionName: "submitSupport" })
  .inputSchema(supportSchema)
  .action(async ({ parsedInput }) => {
    const option = SUPPORT_TYPE_OPTIONS.find(
      (o) => o.value === parsedInput.type,
    );
    const requestType = option?.logged ?? "support";

    const name = cleanText(parsedInput.name, 80);
    const email = cleanEmail(parsedInput.email);
    const firstName = firstNameOf(name);

    try {
      await tasks.trigger<typeof sendSupportEmails>("send-support-emails", {
        requestType,
        name,
        email,
        whatsapp: parsedInput.whatsapp ? toE164(parsedInput.whatsapp) : null,
        message: parsedInput.message
          ? cleanMultiline(parsedInput.message, 2000)
          : null,
        firstName: firstName || undefined,
      });
    } catch (error) {
      logger.error("Failed to enqueue support emails", error);
    }

    return {
      firstName: firstName || name,
      email,
      typeLabel: requestType,
      isCancel: parsedInput.type === "cancel",
    };
  });
