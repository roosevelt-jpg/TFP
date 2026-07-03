import { AbortTaskRunError, logger, retry, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { resend } from "@/lib/clients/resend";
import { WaitlistWelcomeEmail } from "@/emails/waitlist-welcome";
import { env } from "@/env";

export const sendWelcomeEmail = schemaTask({
  id: "send-welcome-email",
  schema: z.object({
    email: z.email(),
    firstName: z.string().optional(),
    ref: z.string(),
  }),
  // A launch spike queues rather than firing at once. Keep this at or below
  // the Resend plan's requests/sec (default ~2) so sends don't 429; raise it
  // in step with the Resend tier.
  queue: { concurrencyLimit: 2 },
  retry: { maxAttempts: 1 },
  maxDuration: 30,
  run: async ({ email, firstName, ref }) => {
    const from = env.RESEND_FROM;
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
            subject: "You're on the waitlist — The Formula Programme",
            react: (
              <WaitlistWelcomeEmail
                firstName={firstName}
                ref={ref}
                appUrl={env.NEXT_PUBLIC_APP_URL}
              />
            ),
          });

          // Resend returns failures as `error` (a value, not a throw):
          // { message, name, statusCode }. Log the full shape, keep the message
          // for the abort below, then throw so onThrow retries.
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
      // Retries exhausted: fail without re-running the whole task, surfacing
      // the last Resend error message in the dashboard.
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
