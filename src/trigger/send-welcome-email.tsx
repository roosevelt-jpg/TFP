import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { resend } from "@/lib/clients/resend";
import { isPermanentSendError } from "@/lib/clients/resend-error";
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
  // Fast first retry for blips, long jittered tail so a rate-limit or outage
  // burst at launch delays welcome emails instead of dropping them
  // (~10s/30s/90s/4.5m/10m). Permanent 4xx aborts in `run` instead.
  retry: {
    maxAttempts: 6,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 600_000,
    factor: 3,
    randomize: true,
  },
  maxDuration: 30,
  run: async ({ email, firstName, ref }, { ctx }) => {
    logger.info("Sending welcome email", {
      ref,
      to: email,
      from: senderFrom,
      attempt: ctx.attempt.number,
    });

    const result = await resend.emails.send(
      {
        from: senderFrom,
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
      },
      // Task retries make delivery at-least-once; Resend dedupes by this key
      // (24h TTL) so a retry after an accepted-but-lost response can't send
      // the welcome twice.
      { idempotencyKey: `welcome/${ref}` },
    );

    if (result.error) {
      const detail = `${result.error.name}: ${result.error.message} (${result.error.statusCode})`;

      if (isPermanentSendError(result.error)) {
        throw new AbortTaskRunError(detail);
      }

      logger.warn("Resend rejected the send; retrying", {
        ref,
        to: email,
        attempt: ctx.attempt.number,
        message: result.error.message,
        name: result.error.name,
        statusCode: result.error.statusCode,
      });

      throw new Error(detail);
    }

    logger.info("Welcome email sent", {
      ref,
      to: email,
      from: senderFrom,
      emailId: result.data?.id,
    });

    return { id: result.data?.id };
  },
  onFailure: async ({ payload, error }) => {
    logger.error("Welcome email permanently failed", {
      ref: payload.ref,
      to: payload.email,
      error,
    });
  },
});
