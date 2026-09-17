import "server-only";

import { tasks } from "@trigger.dev/sdk";

import { env } from "@/env";
import { logger } from "@/lib/logger";
import type { checkoutRecoveryStep } from "@/trigger/checkout-recovery";

function recoveryEnabled() {
  return (
    env.CHECKOUT_RECOVERY_ENABLED === true ||
    String(env.CHECKOUT_RECOVERY_ENABLED) === "true"
  );
}

/** Enqueue the 30m recovery step (further steps chain with delays). */
export async function enqueueCheckoutRecovery(input: {
  sessionId: string;
  email: string;
  name?: string | null;
  whatsapp?: string | null;
  promotionCode?: string | null;
}): Promise<void> {
  if (!recoveryEnabled()) {
    logger.info("Checkout recovery skipped (flag off)", {
      sessionId: input.sessionId,
    });
    return;
  }

  try {
    await tasks.trigger<typeof checkoutRecoveryStep>(
      "checkout-recovery-step",
      {
        sessionId: input.sessionId,
        email: input.email.toLowerCase(),
        name: input.name ?? undefined,
        whatsapp: input.whatsapp ?? undefined,
        promotionCode: input.promotionCode ?? undefined,
        step: "email_30m",
      },
      {
        idempotencyKey: `checkout-recovery:${input.sessionId}:email_30m`,
        idempotencyKeyTTL: "7d",
        delay: "30m",
        queue: "email",
      },
    );
  } catch (error) {
    logger.error("Could not enqueue checkout recovery", error, {
      sessionId: input.sessionId,
    });
  }
}
