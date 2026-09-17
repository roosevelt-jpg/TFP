import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { firstNameOf } from "@/lib/name";
import {
  CURRENCY,
  LAUNCH_PROMOTION_CODE,
  LAUNCH_PROMOTION_LIMIT,
  PRICE_MONTHLY,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
} from "@/lib/pricing";
import { db } from "@/db";
import { LaunchAnnouncementEmail } from "@/emails/launch-announcement";
import { env } from "@/env";
import { emailLogoSrc } from "@/lib/mail/logo";
import { isPermanentMailError, sendMail } from "@/lib/mail/send";

import { emailQueue } from "./queues";

const SUPPORT_URL = `${env.NEXT_PUBLIC_APP_URL}/support`;

// One recipient, one run. Split from the parent so each person gets their own
// entry in the dashboard, their own retries, and so the email queue's
// concurrency limit paces the whole blast against Resend's rate limit.
export const sendLaunchEmail = schemaTask({
  id: "send-launch-email",
  schema: z.object({
    waitlistId: z.string(),
    promoExpiresAt: z.coerce.date(),
  }),
  queue: emailQueue,
  machine: "micro",
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 300_000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 60,
  run: async (payload) => {
    const person = await db.waitlist.findUnique({
      where: { id: payload.waitlistId },
      select: {
        id: true,
        name: true,
        email: true,
        publicToken: true,
        launchEmailAt: true,
      },
    });

    if (!person) {
      throw new AbortTaskRunError(`No waitlist row ${payload.waitlistId}`);
    }

    // Claim before sending. The parent filters on this too, but only this
    // check-and-set is atomic, so it is what actually stops a double send.
    const claimed = await db.waitlist.updateMany({
      where: { id: person.id, launchEmailAt: null },
      data: { launchEmailAt: new Date() },
    });

    if (claimed.count === 0) {
      logger.info("Already announced to this person", {
        waitlistId: person.id,
      });
      return { sent: false };
    }

    try {
      await sendMail({
        channel: "client",
        to: person.email,
        subject: "Doors are open",
        react: (
          <LaunchAnnouncementEmail
            firstName={firstNameOf(person.name)}
            // Carries the token so checkout prefills and the purchase links
            // back to their waitlist row.
            checkoutUrl={`${env.NEXT_PUBLIC_APP_URL}/checkout?t=${person.publicToken}`}
            promoCode={LAUNCH_PROMOTION_CODE}
            promoLimit={LAUNCH_PROMOTION_LIMIT}
            promoExpiresAt={payload.promoExpiresAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Europe/London",
            })}
            priceToday={`${CURRENCY}${PRICE_TODAY}`}
            discountedPrice={`${CURRENCY}${(PRICE_TODAY / 2).toFixed(2)}`}
            monthlyPrice={`${CURRENCY}${PRICE_MONTHLY}`}
            programmeWeeks={PROGRAMME_WEEKS}
            logoUrl={emailLogoSrc()}
            supportUrl={SUPPORT_URL}
          />
        ),
        idempotencyKey: `launch/${person.id}`,
      });

      return { sent: true };
    } catch (error) {
      // Release the claim, or a transient failure means this person never
      // hears from us at all.
      await db.waitlist.updateMany({
        where: { id: person.id },
        data: { launchEmailAt: null },
      });

      const detail =
        error instanceof Error ? error.message : "launch email failed";
      if (isPermanentMailError(error)) {
        throw new AbortTaskRunError(detail);
      }
      throw error instanceof Error ? error : new Error(detail);
    }
  },
  onFailure: async ({ payload, error }) => {
    logger.error("Launch email never reached this person", {
      waitlistId: payload.waitlistId,
      error,
    });
  },
});
