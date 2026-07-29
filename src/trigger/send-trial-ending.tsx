import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { resend } from "@/lib/clients/resend";
import { isPermanentSendError } from "@/lib/clients/resend-error";
import { firstNameOf } from "@/lib/name";
import { portalLoginUrl } from "@/lib/payments/portal";
import { CURRENCY, PRICE_MONTHLY } from "@/lib/pricing";
import { db } from "@/db";
import { TrialEndingEmail } from "@/emails/trial-ending";
import { env } from "@/env";

import { emailQueue } from "./queues";

const SUPPORT_URL = `${env.NEXT_PUBLIC_APP_URL}/support`;

const senderFrom = env.RESEND_FROM.includes("<")
  ? env.RESEND_FROM
  : `The Formula Programme <${env.RESEND_FROM}>`;

// Three days before the first membership charge, from Stripe's own
// trial_will_end. An unannounced charge eight weeks after purchase is the
// most common cause of a chargeback, so this is a billing safeguard as much
// as a courtesy.
export const sendTrialEnding = schemaTask({
  id: "send-trial-ending",
  schema: z.object({ stripeSubscriptionId: z.string() }),
  queue: emailQueue,
  retry: {
    maxAttempts: 6,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 600_000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 60,
  run: async (payload, { ctx }) => {
    const subscription = await db.subscription.findUnique({
      where: { stripeSubscriptionId: payload.stripeSubscriptionId },
      select: {
        id: true,
        trialEnd: true,
        cancelAtPeriodEnd: true,
        customer: { select: { name: true, email: true } },
      },
    });

    if (!subscription) {
      throw new AbortTaskRunError(
        `No subscription ${payload.stripeSubscriptionId} to warn about`,
      );
    }

    // Already on their way out, so a "your membership starts" note would be
    // both wrong and unwelcome.
    if (subscription.cancelAtPeriodEnd) {
      logger.info("Skipping trial heads-up for a cancelled membership", {
        stripeSubscriptionId: payload.stripeSubscriptionId,
      });
      return { skipped: true };
    }

    if (!subscription.trialEnd) {
      throw new AbortTaskRunError(
        `Subscription ${payload.stripeSubscriptionId} has no trial end date`,
      );
    }

    // Claim before sending. Stripe can deliver trial_will_end more than once,
    // and the Trigger idempotency key expires long before this column does.
    const claimed = await db.subscription.updateMany({
      where: { id: subscription.id, trialEndingEmailAt: null },
      data: { trialEndingEmailAt: new Date() },
    });

    if (claimed.count === 0) {
      logger.info("Trial heads-up already sent", {
        stripeSubscriptionId: payload.stripeSubscriptionId,
      });
      return { skipped: true };
    }

    const result = await resend.emails.send(
      {
        from: senderFrom,
        to: subscription.customer.email,
        subject: "Your membership starts soon",
        react: (
          <TrialEndingEmail
            firstName={firstNameOf(subscription.customer.name)}
            monthlyPrice={`${CURRENCY}${PRICE_MONTHLY}`}
            chargeDate={subscription.trialEnd.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
            })}
            billingUrl={await portalLoginUrl(subscription.customer.email)}
            logoUrl={env.EMAIL_LOGO_URL}
            supportUrl={SUPPORT_URL}
          />
        ),
      },
      { idempotencyKey: `trial-ending/${payload.stripeSubscriptionId}` },
    );

    if (result.error) {
      // Release the claim, or a transient Resend failure means nobody ever
      // gets the warning.
      await db.subscription.updateMany({
        where: { id: subscription.id },
        data: { trialEndingEmailAt: null },
      });

      const detail = `${result.error.name}: ${result.error.message} (${result.error.statusCode})`;
      if (isPermanentSendError(result.error)) {
        throw new AbortTaskRunError(detail);
      }

      logger.warn("Resend rejected the trial heads-up; retrying", {
        stripeSubscriptionId: payload.stripeSubscriptionId,
        attempt: ctx.attempt.number,
        message: result.error.message,
      });
      throw new Error(detail);
    }

    logger.info("Trial heads-up sent", {
      stripeSubscriptionId: payload.stripeSubscriptionId,
      chargeDate: subscription.trialEnd,
    });

    return { skipped: false };
  },
  onFailure: async ({ payload, error }) => {
    // The charge still lands in three days. Nobody warned them, so this is
    // where a future dispute gets explained.
    logger.error("Trial heads-up never sent; the charge will be a surprise", {
      stripeSubscriptionId: payload.stripeSubscriptionId,
      error,
    });
  },
});
