import "server-only";

import { tasks } from "@trigger.dev/sdk";

import { logger } from "@/lib/logger";
import type { checkOnboardingIncomplete } from "@/trigger/check-onboarding-incomplete";
import type { sendWaitlistNurture } from "@/trigger/send-waitlist-nurture";

export async function enqueueWaitlistNurture(input: {
  waitlistId: string;
  email: string;
  name?: string;
}) {
  try {
    await tasks.trigger<typeof sendWaitlistNurture>(
      "send-waitlist-nurture",
      { ...input, day: 2 },
      {
        idempotencyKey: `waitlist-nurture:${input.waitlistId}:day-2`,
        idempotencyKeyTTL: "14d",
        delay: "48h",
        queue: "email",
      },
    );
  } catch (error) {
    logger.error("Could not enqueue waitlist nurture", error, {
      waitlistId: input.waitlistId,
    });
  }
}

export async function enqueueOnboardingCheck(input: {
  customerId: string;
  purchaseRef: string;
}) {
  try {
    await tasks.trigger<typeof checkOnboardingIncomplete>(
      "check-onboarding-incomplete",
      input,
      {
        idempotencyKey: `onboarding-check:${input.purchaseRef}`,
        idempotencyKeyTTL: "14d",
        delay: "24h",
        queue: "email",
      },
    );
  } catch (error) {
    logger.error("Could not enqueue onboarding check", error, input);
  }
}
