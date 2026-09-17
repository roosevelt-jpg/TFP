import { AbortTaskRunError, logger, schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { WaitlistNurtureEmail } from "@/emails/waitlist-nurture";
import { env } from "@/env";
import { firstNameOf } from "@/lib/name";
import { emailLogoSrc } from "@/lib/mail/logo";
import { isPermanentMailError, sendMail } from "@/lib/mail/send";
import {
  completeWorkflow,
  logOutboundMessage,
  recordFunnelEvent,
  stopWorkflow,
  upsertWorkflow,
} from "@/lib/funnel/records";
import { customerHasPurchased } from "@/lib/payments/has-purchased";
import { db } from "@/db";
import { SIGNUP_HREF } from "@/lib/launch";

import { emailQueue } from "./queues";

const schema = z.object({
  waitlistId: z.string(),
  email: z.email(),
  name: z.string().optional(),
  day: z.union([z.literal(2), z.literal(5)]),
});

export const sendWaitlistNurture = schemaTask({
  id: "send-waitlist-nurture",
  schema,
  queue: emailQueue,
  retry: { maxAttempts: 4, minTimeoutInMs: 5000, factor: 2 },
  maxDuration: 60,
  run: async (payload) => {
    if (
      env.LEAD_NURTURE_ENABLED !== true &&
      String(env.LEAD_NURTURE_ENABLED) !== "true"
    ) {
      return { skipped: true, reason: "flag_off" };
    }

    if (await customerHasPurchased(payload.email)) {
      await stopWorkflow(`waitlist-nurture:${payload.waitlistId}`, "purchased");
      return { skipped: true, reason: "purchased" };
    }

    const lead = await db.waitlist.findUnique({
      where: { id: payload.waitlistId },
      select: { id: true, email: true, name: true },
    });
    if (!lead) throw new AbortTaskRunError("Waitlist row gone");

    const workflow = await upsertWorkflow({
      dedupeKey: `waitlist-nurture:${payload.waitlistId}`,
      workflowKey: "waitlist_nurture",
      waitlistId: payload.waitlistId,
      email: payload.email,
      currentStep: `day_${payload.day}`,
      state: "running",
    });

    const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const ctaUrl = `${appUrl}${SIGNUP_HREF.startsWith("/") ? SIGNUP_HREF : `/${SIGNUP_HREF}`}`;

    try {
      const result = await sendMail({
        channel: "client",
        to: payload.email,
        subject:
          payload.day === 2
            ? "What week one actually looks like"
            : "Founder seats move fast",
        react: (
          <WaitlistNurtureEmail
            firstName={firstNameOf(payload.name ?? lead.name)}
            day={payload.day}
            ctaUrl={ctaUrl}
            logoUrl={emailLogoSrc()}
          />
        ),
        idempotencyKey: `waitlist-nurture/${payload.waitlistId}/day-${payload.day}`,
      });

      await logOutboundMessage({
        waitlistId: payload.waitlistId,
        workflowExecutionId: workflow.id,
        channel: "email",
        templateId: `waitlist-nurture-day-${payload.day}`,
        providerMessageId: result.id,
        status: "sent",
      });

      await recordFunnelEvent({
        eventName: "nurture_sent",
        waitlistId: payload.waitlistId,
        source: "email",
        properties: { day: payload.day, driver: result.driver },
        eventId: `nurture:${payload.waitlistId}:day-${payload.day}`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "nurture failed";
      if (isPermanentMailError(error)) throw new AbortTaskRunError(detail);
      throw error instanceof Error ? error : new Error(detail);
    }

    if (payload.day === 2) {
      await tasks.trigger<typeof sendWaitlistNurture>(
        "send-waitlist-nurture",
        { ...payload, day: 5 },
        {
          idempotencyKey: `waitlist-nurture:${payload.waitlistId}:day-5`,
          idempotencyKeyTTL: "14d",
          delay: "72h",
          queue: "email",
        },
      );
    } else {
      await completeWorkflow(`waitlist-nurture:${payload.waitlistId}`);
    }

    return { sent: true, day: payload.day };
  },
});
