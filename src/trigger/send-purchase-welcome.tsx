import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { firstNameOf } from "@/lib/name";
import { portalLoginUrl } from "@/lib/payments/portal";
import { CURRENCY, PRICE_MONTHLY, PROGRAMME_WEEKS } from "@/lib/pricing";
import { COACH_WHATSAPP_URL } from "@/lib/whatsapp";
import { db } from "@/db";
import { PurchaseWelcomeEmail } from "@/emails/purchase-welcome";
import { env } from "@/env";
import { emailLogoSrc } from "@/lib/mail/logo";
import { isPermanentMailError, sendMail } from "@/lib/mail/send";

import { emailQueue } from "./queues";

const SUPPORT_URL = `${env.NEXT_PUBLIC_APP_URL}/support`;

// Chained from the watermark task rather than enqueued beside it, because the
// download link has to point at a file that already exists. withPdf is false
// when watermarking failed for good: the buyer still needs the WhatsApp step,
// so the email goes without a link rather than not at all.
export const sendPurchaseWelcome = schemaTask({
  id: "send-purchase-welcome",
  schema: z.object({
    purchaseRef: z.string(),
    withPdf: z.boolean().default(true),
  }),
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
    const purchase = await db.purchase.findUnique({
      where: { ref: payload.purchaseRef },
      select: {
        id: true,
        pdfToken: true,
        purchasedAt: true,
        welcomeEmailAt: true,
        customer: { select: { name: true, email: true } },
      },
    });

    if (!purchase) {
      throw new AbortTaskRunError(
        `No purchase ${payload.purchaseRef} to email`,
      );
    }

    // Claim the send before doing it. Trigger's idempotency key expires; this
    // column does not, so a replay months later still cannot send twice.
    const claimed = await db.purchase.updateMany({
      where: { id: purchase.id, welcomeEmailAt: null },
      data: { welcomeEmailAt: new Date() },
    });

    if (claimed.count === 0) {
      logger.info("Welcome already sent for this purchase", {
        purchaseRef: payload.purchaseRef,
      });
      return { skipped: true };
    }

    const rollover = new Date(purchase.purchasedAt ?? new Date());
    rollover.setDate(rollover.getDate() + PROGRAMME_WEEKS * 7);

    try {
      const result = await sendMail({
        channel: "client",
        to: purchase.customer.email,
        subject: "You're in - The Formula Programme",
        eligibility: {
          purpose: "transactional",
        },
        react: (
          <PurchaseWelcomeEmail
            firstName={firstNameOf(purchase.customer.name)}
            orderRef={payload.purchaseRef}
            programmeWeeks={PROGRAMME_WEEKS}
            monthlyPrice={`${CURRENCY}${PRICE_MONTHLY}`}
            rolloverDate={rollover.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
            })}
            pdfUrl={
              payload.withPdf
                ? `${env.NEXT_PUBLIC_APP_URL}/api/programme/${purchase.pdfToken}`
                : null
            }
            whatsappUrl={COACH_WHATSAPP_URL}
            billingUrl={await portalLoginUrl(purchase.customer.email)}
            logoUrl={emailLogoSrc()}
            communityImageUrl={env.EMAIL_COMMUNITY_URL}
            supportUrl={SUPPORT_URL}
          />
        ),
        idempotencyKey: `purchase-welcome/${payload.purchaseRef}`,
      });

      logger.info("Purchase welcome sent", {
        purchaseRef: payload.purchaseRef,
        to: purchase.customer.email,
        withPdf: payload.withPdf,
        emailId: result.id,
        driver: result.driver,
      });

      return { id: result.id, driver: result.driver };
    } catch (error) {
      // Release the claim so a retry can send: the column is a lock, and
      // holding it after a failure would mean nobody ever gets the email.
      await db.purchase.updateMany({
        where: { id: purchase.id },
        data: { welcomeEmailAt: null },
      });

      const detail =
        error instanceof Error ? error.message : "purchase welcome failed";
      if (isPermanentMailError(error)) {
        throw new AbortTaskRunError(detail);
      }

      logger.warn("Purchase welcome failed; retrying", {
        purchaseRef: payload.purchaseRef,
        attempt: ctx.attempt.number,
        message: detail,
      });
      throw error instanceof Error ? error : new Error(detail);
    }
  },
  onFailure: async ({ payload, error }) => {
    logger.error("Purchase welcome permanently failed", {
      purchaseRef: payload.purchaseRef,
      error,
    });
  },
});
