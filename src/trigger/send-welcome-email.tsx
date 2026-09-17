import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { siteConfig } from "@/config/site";
import { WaitlistWelcomeEmail } from "@/emails/waitlist-welcome";
import { env } from "@/env";
import { emailLogoSrc } from "@/lib/mail/logo";
import { isPermanentMailError, sendMail } from "@/lib/mail/send";

import { emailQueue } from "./queues";

const INSTAGRAM_URL = "https://instagram.com/kanem14";
const UNSUBSCRIBE_MAILTO = `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent("Leave the waitlist")}`;

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
      attempt: ctx.attempt.number,
    });

    try {
      const result = await sendMail({
        channel: "client",
        to: email,
        subject: "You're on the list - The Formula Programme",
        react: (
          <WaitlistWelcomeEmail
            firstName={firstName}
            waitlistRef={ref}
            logoUrl={emailLogoSrc()}
            communityImageUrl={env.EMAIL_COMMUNITY_URL}
            instagramUrl={INSTAGRAM_URL}
            unsubscribeUrl={UNSUBSCRIBE_MAILTO}
          />
        ),
        headers: { "List-Unsubscribe": `<${UNSUBSCRIBE_MAILTO}>` },
        idempotencyKey: `welcome/${ref}`,
      });

      logger.info("Welcome email sent", {
        ref,
        to: email,
        emailId: result.id,
        driver: result.driver,
      });

      return { id: result.id, driver: result.driver };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "welcome email failed";

      if (isPermanentMailError(error)) {
        throw new AbortTaskRunError(detail);
      }

      logger.warn("Welcome send failed; retrying", {
        ref,
        to: email,
        attempt: ctx.attempt.number,
        message: detail,
      });

      throw error instanceof Error ? error : new Error(detail);
    }
  },
  onFailure: async ({ payload, error }) => {
    logger.error("Welcome email permanently failed", {
      ref: payload.ref,
      to: payload.email,
      error,
    });
  },
});
