import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { db } from "@/db";
import {
  recordFunnelEvent,
  upsertWorkflow,
} from "@/lib/funnel/records";
import { enqueueActivationReminderWhatsApp } from "@/lib/whatsapp/enqueue";

import { emailQueue } from "./queues";

/** 24h after purchase: flag members who never completed coaching intake. */
export const checkOnboardingIncomplete = schemaTask({
  id: "check-onboarding-incomplete",
  schema: z.object({
    customerId: z.string(),
    purchaseRef: z.string(),
  }),
  queue: emailQueue,
  retry: { maxAttempts: 3 },
  maxDuration: 30,
  run: async ({ customerId, purchaseRef }) => {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        whatsapp: true,
        coaching: { select: { id: true } },
      },
    });
    if (!customer) throw new AbortTaskRunError("Customer missing");

    if (customer.coaching) {
      return { incomplete: false };
    }

    await upsertWorkflow({
      dedupeKey: `onboarding-incomplete:${purchaseRef}`,
      workflowKey: "onboarding_incomplete",
      customerId,
      email: customer.email,
      currentStep: "24h",
      state: "running",
    });

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
        payload: { customerId, purchaseRef, email: customer.email },
        threadKey: `onboarding:${purchaseRef}`,
      },
    });

    if (customer.whatsapp) {
      await enqueueActivationReminderWhatsApp({
        customerId,
        purchaseRef,
        whatsapp: customer.whatsapp,
        firstName: customer.name.split(/\s+/)[0] ?? customer.name,
      });
    }

    await recordFunnelEvent({
      eventName: "onboarding_incomplete",
      customerId,
      source: "scheduler",
      properties: { purchaseRef, hours: 24 },
      eventId: `onboarding-incomplete:${purchaseRef}:24h`,
    });

    logger.info("Onboarding incomplete flagged", { purchaseRef, customerId });
    return { incomplete: true };
  },
});
