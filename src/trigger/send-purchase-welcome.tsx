import { AbortTaskRunError, logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { resend } from "@/lib/clients/resend";
import { isPermanentSendError } from "@/lib/clients/resend-error";
import { firstNameOf } from "@/lib/name";
import { portalLoginUrl } from "@/lib/payments/portal";
import { CURRENCY, PRICE_MONTHLY, PROGRAMME_WEEKS } from "@/lib/pricing";
import { COACH_WHATSAPP_URL } from "@/lib/whatsapp";
import { db } from "@/db";
import { PurchaseWelcomeEmail } from "@/emails/purchase-welcome";
import { env } from "@/env";

import { emailQueue } from "./queues";

const SUPPORT_URL = `${env.NEXT_PUBLIC_APP_URL}/support`;

// Matches the waitlist sender: RESEND_FROM may already carry a display name.
const senderFrom = env.RESEND_FROM.includes("<")
  ? env.RESEND_FROM
  : `The Formula Programme <${env.RESEND_FROM}>`;

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

    const result = await resend.emails.send(
      {
        from: senderFrom,
        to: purchase.customer.email,
        subject: "You're in - The Formula Programme",
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
            logoUrl={env.EMAIL_LOGO_URL}
            communityImageUrl={env.EMAIL_COMMUNITY_URL}
            supportUrl={SUPPORT_URL}
          />
        ),
      },
      { idempotencyKey: `purchase-welcome/${payload.purchaseRef}` },
    );

    if (result.error) {
      // Release the claim so a retry can send: the column is a lock, and
      // holding it after a failure would mean nobody ever gets the email.
      await db.purchase.updateMany({
        where: { id: purchase.id },
        data: { welcomeEmailAt: null },
      });

      const detail = `${result.error.name}: ${result.error.message} (${result.error.statusCode})`;
      if (isPermanentSendError(result.error)) {
        throw new AbortTaskRunError(detail);
      }

      logger.warn("Resend rejected the purchase welcome; retrying", {
        purchaseRef: payload.purchaseRef,
        attempt: ctx.attempt.number,
        message: result.error.message,
      });
      throw new Error(detail);
    }

    logger.info("Purchase welcome sent", {
      purchaseRef: payload.purchaseRef,
      to: purchase.customer.email,
      withPdf: payload.withPdf,
      emailId: result.data?.id,
    });

    return { id: result.data?.id };
  },
  onFailure: async ({ payload, error }) => {
    logger.error("Purchase welcome permanently failed", {
      purchaseRef: payload.purchaseRef,
      error,
    });
  },
});
