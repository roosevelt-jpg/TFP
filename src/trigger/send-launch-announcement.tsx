import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { openPromoWindow } from "@/lib/payments/promo-window";
import { db } from "@/db";

import { sendLaunchEmail } from "./send-launch-email";

// Trigger caps a batch at 1,000 items. The list is nowhere near that, but a
// blast that silently truncates would be worse than one that refuses to run.
const MAX_BATCH = 1000;

// Run once by hand on launch day, from the Trigger dashboard.
//
// Defaults to a dry run: reports who would be emailed and sends nothing. Pass
// { execute: true } to send for real. Everyone already emailed is skipped, so a
// re-run after a partial failure picks up only the people who were missed.
export const sendLaunchAnnouncement = schemaTask({
  id: "send-launch-announcement",
  schema: z.object({
    execute: z.boolean().default(false),
    // Belt and braces for a one-shot blast to real people: if the count is not
    // what the operator expected, nothing is sent.
    expectedCount: z.number().int().positive().optional(),
  }),
  machine: "micro",
  maxDuration: 900,
  run: async (payload) => {
    const pending = await db.waitlist.findMany({
      where: { launchEmailAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    });

    if (pending.length === 0) {
      logger.info("Everyone on the waitlist has already been told");
      return { queued: 0, sent: 0, failed: 0 };
    }

    if (pending.length > MAX_BATCH) {
      throw new AbortTaskRunError(
        `${pending.length} recipients exceeds the ${MAX_BATCH} batch limit`,
      );
    }

    if (payload.expectedCount && pending.length !== payload.expectedCount) {
      throw new AbortTaskRunError(
        `Expected ${payload.expectedCount} recipients but found ${pending.length}. Nothing sent.`,
      );
    }

    if (!payload.execute) {
      logger.info("Dry run: nobody emailed", {
        wouldEmail: pending.length,
        sample: pending.slice(0, 3).map((row) => row.email),
      });
      return { queued: 0, sent: 0, failed: 0, wouldEmail: pending.length };
    }

    // Before any email goes out, so nobody is told a deadline that is not yet
    // set. Stripe enforces it, so the date in the email is the date Checkout
    // applies.
    const expiresAt = await openPromoWindow();

    if (!expiresAt) {
      throw new AbortTaskRunError(
        "Could not set the promo deadline; nothing sent",
      );
    }

    // One child run per person: each retries independently, each is visible in
    // the dashboard, and the email queue's concurrency limit paces the whole
    // blast against Resend's rate limit.
    const batch = await sendLaunchEmail.batchTriggerAndWait(
      pending.map((row) => ({
        payload: {
          waitlistId: row.id,
          promoExpiresAt: expiresAt.toISOString(),
        },
        options: {
          idempotencyKey: `launch:${row.id}`,
          idempotencyKeyTTL: "7d",
        },
      })),
    );

    // A failure here is one person, not the blast. Reported rather than thrown
    // so the rest still count as sent and a re-run retries only the stragglers.
    const failed = batch.runs.filter((run) => !run.ok);

    for (const run of failed) {
      logger.error("Launch email run failed", { runId: run.id });
    }

    const summary = {
      queued: pending.length,
      sent: batch.runs.length - failed.length,
      failed: failed.length,
    };

    logger.info("Launch announcement finished", summary);

    return summary;
  },
});
