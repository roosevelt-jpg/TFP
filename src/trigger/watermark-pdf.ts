import { AbortTaskRunError, logger, schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { readMasterPdf, writePurchasePdf } from "@/lib/pdf/storage";
import { watermarkPdf } from "@/lib/pdf/watermark";
import { db } from "@/db";

import { pdfQueue } from "./queues";
import type { sendPurchaseWelcome } from "./send-purchase-welcome";

// Stamps one copy per purchase, then hands off to the welcome email. The email
// carries the download link, so it is chained rather than enqueued alongside:
// sending first would link to a file that does not exist yet.
export const watermarkPurchasePdf = schemaTask({
  id: "watermark-pdf",
  schema: z.object({
    purchaseRef: z.string(),
    name: z.string(),
    email: z.email(),
  }),
  queue: pdfQueue,
  // Loading a 39-page PDF into memory, so not the smallest machine.
  machine: "small-1x",
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
    factor: 2,
    randomize: true,
  },
  // CPU time per attempt: the stamp itself is ~100ms, the rest is two Blob
  // round trips for a file of a few megabytes.
  maxDuration: 120,
  run: async (payload) => {
    const purchase = await db.purchase.findUnique({
      where: { ref: payload.purchaseRef },
      select: { id: true, pdfReadyAt: true },
    });

    if (!purchase) {
      throw new AbortTaskRunError(
        `No purchase ${payload.purchaseRef} to watermark`,
      );
    }

    // Already stamped by an earlier attempt: skip the work but still chain, so
    // a replay that lost the email recovers it.
    if (!purchase.pdfReadyAt) {
      const master = await readMasterPdf();
      if (!master) {
        // The client's file is missing or the store is misconfigured. Neither
        // is fixed by retrying.
        throw new AbortTaskRunError("The master programme PDF is unavailable");
      }

      const stamped = await watermarkPdf(master, {
        name: payload.name,
        email: payload.email,
        orderRef: payload.purchaseRef,
      });

      const pathname = await writePurchasePdf(payload.purchaseRef, stamped);

      // Check-and-set on the ledger: the column is what tells the email a link
      // is safe to include, and what stops a replay stamping twice.
      await db.purchase.updateMany({
        where: { id: purchase.id, pdfReadyAt: null },
        data: { pdfReadyAt: new Date() },
      });

      logger.info("Programme PDF watermarked", {
        purchaseRef: payload.purchaseRef,
        pathname,
        bytes: stamped.length,
      });
    }

    await tasks.trigger<typeof sendPurchaseWelcome>(
      "send-purchase-welcome",
      { purchaseRef: payload.purchaseRef, withPdf: true },
      {
        idempotencyKey: `welcome:${payload.purchaseRef}`,
        idempotencyKeyTTL: "30d",
      },
    );

    return { purchaseRef: payload.purchaseRef };
  },
  // Reached only after every retry. The buyer has paid and still needs the
  // WhatsApp step, so the welcome goes out without a download link rather than
  // leaving them with nothing.
  onFailure: async ({ payload, error }) => {
    logger.error("Programme PDF could not be watermarked", {
      purchaseRef: payload.purchaseRef,
      error,
    });

    await tasks.trigger<typeof sendPurchaseWelcome>(
      "send-purchase-welcome",
      { purchaseRef: payload.purchaseRef, withPdf: false },
      {
        idempotencyKey: `welcome:${payload.purchaseRef}`,
        idempotencyKeyTTL: "30d",
      },
    );
  },
});
