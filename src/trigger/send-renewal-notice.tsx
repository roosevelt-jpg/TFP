import { AbortTaskRunError, logger, schedules, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { firstNameOf } from "@/lib/name";
import { portalLoginUrl } from "@/lib/payments/portal";
import { PRICE_MONTHLY, CURRENCY } from "@/lib/pricing";
import { db } from "@/db";
import { TrialEndingEmail } from "@/emails/trial-ending";
import { env } from "@/env";
import { emailLogoSrc } from "@/lib/mail/logo";
import { isPermanentMailError, sendMail } from "@/lib/mail/send";
import { recordFunnelEvent } from "@/lib/funnel/records";

import { emailQueue } from "./queues";

const SUPPORT_URL = `${env.NEXT_PUBLIC_APP_URL}/support`;

/**
 * Spec §10.7 — renewal approaching notices at 14 / 7 / 2 days before period end.
 */
export const sendRenewalNotice = schemaTask({
  id: "send-renewal-notice",
  schema: z.object({
    subscriptionId: z.string(),
    daysBefore: z.union([z.literal(14), z.literal(7), z.literal(2)]),
  }),
  queue: emailQueue,
  retry: {
    maxAttempts: 4,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 120_000,
    factor: 2,
  },
  maxDuration: 60,
  run: async (payload) => {
    const sub = await db.subscription.findUnique({
      where: { id: payload.subscriptionId },
      include: { customer: true },
    });
    if (!sub) {
      throw new AbortTaskRunError(`No subscription ${payload.subscriptionId}`);
    }
    if (sub.status !== "active" && sub.status !== "trialing") {
      return { skipped: true, reason: sub.status };
    }

    const dedupe = `renewal:${sub.id}:${payload.daysBefore}`;
    const already = await db.outboundMessage.findFirst({
      where: { templateId: dedupe, status: "sent" },
    });
    if (already) return { skipped: true, reason: "already_sent" };

    const chargeDate = (sub.currentPeriodEnd ?? new Date()).toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "long" },
    );

    try {
      const result = await sendMail({
        channel: "client",
        to: sub.customer.email,
        subject: `Your Formula membership renews in ${payload.daysBefore} days`,
        eligibility: { customerId: sub.customerId, purpose: "transactional" },
        react: (
          <TrialEndingEmail
            firstName={firstNameOf(sub.customer.name)}
            monthlyPrice={`${CURRENCY}${PRICE_MONTHLY}`}
            chargeDate={chargeDate}
            billingUrl={await portalLoginUrl(sub.customer.email)}
            logoUrl={emailLogoSrc()}
            supportUrl={SUPPORT_URL}
          />
        ),
        idempotencyKey: dedupe,
      });

      await db.outboundMessage.create({
        data: {
          customerId: sub.customerId,
          channel: "email",
          templateId: dedupe,
          providerMessageId: result.id,
          status: "sent",
          sentAt: new Date(),
        },
      });

      await recordFunnelEvent({
        eventName: "renewal_approaching",
        customerId: sub.customerId,
        source: "scheduler",
        properties: { daysBefore: payload.daysBefore },
        eventId: dedupe,
      });

      return { sent: true };
    } catch (error) {
      if (isPermanentMailError(error)) {
        logger.warn("Renewal notice permanently failed", {
          subscriptionId: sub.id,
          error: error instanceof Error ? error.message : String(error),
        });
        return { skipped: true, reason: "permanent_mail_error" };
      }
      throw error;
    }
  },
});

export const renewalNoticeSchedule = schedules.task({
  id: "renewal-notice-schedule",
  cron: { pattern: "0 9 * * *", environments: ["PRODUCTION"] },
  run: async () => {
    const now = Date.now();
    const targets: Array<14 | 7 | 2> = [14, 7, 2];
    let enqueued = 0;

    for (const days of targets) {
      const from = new Date(now + (days - 0.5) * 24 * 60 * 60 * 1000);
      const to = new Date(now + (days + 0.5) * 24 * 60 * 60 * 1000);
      const subs = await db.subscription.findMany({
        where: {
          status: { in: ["active", "trialing"] },
          currentPeriodEnd: { gte: from, lte: to },
        },
        take: 200,
      });
      for (const sub of subs) {
        await sendRenewalNotice.trigger({
          subscriptionId: sub.id,
          daysBefore: days,
        });
        enqueued += 1;
      }
    }

    return { enqueued };
  },
});
