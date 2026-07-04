import { AbortTaskRunError, logger, retry, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { resend } from "@/lib/clients/resend";
import { siteConfig } from "@/config/site";
import { WaitlistWelcomeEmail } from "@/emails/waitlist-welcome";
import { env } from "@/env";

import { emailQueue } from "./queues";

const INSTAGRAM_URL = "https://instagram.com/kanem14";
const UNSUBSCRIBE_MAILTO = `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent("Leave the waitlist")}`;

const senderFrom = env.RESEND_FROM.includes("<")
  ? env.RESEND_FROM
  : `${siteConfig.name} <${env.RESEND_FROM}>`;

export const sendWelcomeEmail = schemaTask({
  id: "send-welcome-email",
  schema: z.object({
    email: z.email(),
    firstName: z.string().optional(),
    ref: z.string(),
  }),
  queue: emailQueue,
  retry: { maxAttempts: 1 },
  maxDuration: 30,
  run: async ({ email, firstName, ref }) => {
    const from = senderFrom;
    let lastError = "Failed to send welcome email";

    const data = await retry
      .onThrow(
        async ({ attempt }) => {
          logger.info("Sending welcome email", {
            ref,
            to: email,
            from,
            attempt,
          });

          const result = await resend.emails.send({
            from,
            to: email,
            subject: "You're on the list — The Formula Programme",
            react: (
              <WaitlistWelcomeEmail
                firstName={firstName}
                waitlistRef={ref}
                logoUrl={env.EMAIL_LOGO_URL}
                communityImageUrl={env.EMAIL_COMMUNITY_URL}
                instagramUrl={INSTAGRAM_URL}
                unsubscribeUrl={UNSUBSCRIBE_MAILTO}
              />
            ),
            headers: { "List-Unsubscribe": `<${UNSUBSCRIBE_MAILTO}>` },
          });

          if (result.error) {
            lastError = `${result.error.name}: ${result.error.message} (${result.error.statusCode})`;
            logger.warn("Resend rejected the send", {
              ref,
              to: email,
              attempt,
              message: result.error.message,
              name: result.error.name,
              statusCode: result.error.statusCode,
            });
            throw result.error;
          }

          return result.data;
        },
        { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2 },
      )

      .catch(() => {
        throw new AbortTaskRunError(lastError);
      });

    logger.info("Welcome email sent", {
      ref,
      to: email,
      from,
      emailId: data?.id,
    });

    return { id: data?.id };
  },
  onFailure: async ({ payload, error }) => {
    logger.error("Welcome email permanently failed", {
      ref: payload.ref,
      to: payload.email,
      error,
    });
  },
});
