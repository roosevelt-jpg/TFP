import { AbortTaskRunError, logger, schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { db } from "@/db";
import { OnboardingResumeEmail } from "@/emails/onboarding-resume";
import { env } from "@/env";
import {
  recordFunnelEvent,
  stopWorkflow,
  upsertWorkflow,
} from "@/lib/funnel/records";
import { emailLogoSrc } from "@/lib/mail/logo";
import { isPermanentMailError, sendMail } from "@/lib/mail/send";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import { enqueueActivationReminderWhatsApp } from "@/lib/whatsapp/enqueue";

import { emailQueue } from "./queues";

const STEPS = ["24h", "48h"] as const;

/** 24h after purchase: resume email if coaching intake is still open. 48h: escalate. */
export const checkOnboardingIncomplete = schemaTask({
  id: "check-onboarding-incomplete",
  schema: z.object({
    customerId: z.string(),
    purchaseRef: z.string(),
    step: z.enum(STEPS).default("24h"),
  }),
  queue: emailQueue,
  retry: { maxAttempts: 3 },
  maxDuration: 30,
  run: async ({ customerId, purchaseRef, step }) => {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        whatsapp: true,
        coaching: { select: { id: true } },
        purchases: {
          where: { ref: purchaseRef },
          select: { stripeCheckoutSessionId: true },
          take: 1,
        },
      },
    });
    if (!customer) throw new AbortTaskRunError("Customer missing");

    const dedupeKey = `onboarding-incomplete:${purchaseRef}`;
    if (customer.coaching) {
      await stopWorkflow(dedupeKey, "activated");
      return { incomplete: false, step };
    }

    const firstName = customer.name.split(/\s+/)[0] ?? customer.name;
    const sessionId = customer.purchases[0]?.stripeCheckoutSessionId;
    const resumeUrl = sessionId
      ? `${env.NEXT_PUBLIC_APP_URL}/success?session_id=${encodeURIComponent(sessionId)}`
      : `${env.NEXT_PUBLIC_APP_URL}/support`;

    await upsertWorkflow({
      dedupeKey,
      workflowKey: "onboarding_incomplete",
      customerId,
      email: customer.email,
      currentStep: step,
      state: step === "48h" ? "escalated" : "running",
      nextActionAt:
        step === "24h" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    });

    if (step === "24h") {
      try {
        await sendMail({
          channel: "client",
          to: customer.email,
          subject: "One step left on your programme",
          eligibility: { purpose: "transactional", customerId },
          react: (
            <OnboardingResumeEmail
              firstName={firstName}
              resumeUrl={resumeUrl}
              logoUrl={emailLogoSrc()}
            />
          ),
          idempotencyKey: `onboarding-resume/${purchaseRef}`,
        });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "resume email failed";
        if (!isPermanentMailError(error)) {
          throw error instanceof Error ? error : new Error(detail);
        }
        logger.warn("Onboarding resume email skipped", {
          purchaseRef,
          detail,
        });
      }

      await db.staffTodo.create({
        data: {
          personKey: "lemoni",
          title: `Onboarding incomplete (24h): ${customer.email}`,
          source: "system",
          dueAt: new Date(),
          createdBy: "onboarding-check",
        },
      });

      await db.alert.create({
        data: {
          ruleId: "onboarding.incomplete.24h",
          severity: "p3",
          title: "Member has not completed coaching intake",
          payload: { customerId, purchaseRef, email: customer.email, resumeUrl },
          threadKey: `onboarding:${purchaseRef}:24h`,
        },
      });

      if (customer.whatsapp) {
        await enqueueActivationReminderWhatsApp({
          customerId,
          purchaseRef,
          whatsapp: customer.whatsapp,
          firstName,
        });
      }

      await tasks.trigger<typeof checkOnboardingIncomplete>(
        "check-onboarding-incomplete",
        { customerId, purchaseRef, step: "48h" },
        {
          idempotencyKey: `onboarding-check:${purchaseRef}:48h`,
          idempotencyKeyTTL: "14d",
          delay: "24h",
          queue: "email",
        },
      );
    } else {
      await db.staffTodo.create({
        data: {
          personKey: "lemoni",
          title: `Onboarding still open (48h): ${customer.email}`,
          source: "system",
          dueAt: new Date(),
          createdBy: "onboarding-check",
        },
      });

      await db.alert.create({
        data: {
          ruleId: "onboarding.incomplete.48h",
          severity: "p2",
          title: `Escalate: ${customer.email} has not finished intake`,
          payload: { customerId, purchaseRef, email: customer.email, resumeUrl },
          threadKey: `onboarding:${purchaseRef}:48h`,
        },
      });

      const kaneChatId = await getKaneTelegramChatId();
      if (kaneChatId) {
        await sendTelegramMessage({
          chatId: kaneChatId,
          text: `P2 · ${customer.email} paid 48h ago and has not finished coaching intake. ${resumeUrl}`,
        });
      }
    }

    await recordFunnelEvent({
      eventName: "onboarding_incomplete",
      customerId,
      source: "scheduler",
      properties: { purchaseRef, hours: step === "24h" ? 24 : 48 },
      eventId: `onboarding-incomplete:${purchaseRef}:${step}`,
    });

    logger.info("Onboarding incomplete flagged", {
      purchaseRef,
      customerId,
      step,
    });
    return { incomplete: true, step };
  },
});
