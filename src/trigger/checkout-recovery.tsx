import { AbortTaskRunError, logger, schemaTask, tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { CheckoutRecoveryEmail } from "@/emails/checkout-recovery";
import { env } from "@/env";
import { addGhlTags, upsertGhlContact } from "@/lib/clients/ghl";
import { firstNameOf } from "@/lib/name";
import { emailLogoSrc } from "@/lib/mail/logo";
import { isPermanentMailError, sendMail } from "@/lib/mail/send";
import { resolveOffer } from "@/lib/offers/resolve";
import { customerHasPurchased } from "@/lib/payments/has-purchased";
import { LAUNCH_PROMOTION_CODE } from "@/lib/pricing";
import { TAGS } from "@/lib/ghl/membership-tags";
import { db } from "@/db";

import { emailQueue } from "./queues";

const STEPS = ["email_30m", "email_6h", "whatsapp_24h", "human_48h"] as const;

const schema = z.object({
  sessionId: z.string(),
  email: z.email(),
  name: z.string().optional(),
  whatsapp: z.string().optional(),
  promotionCode: z.string().optional(),
  step: z.enum(STEPS),
});

type Step = (typeof STEPS)[number];

const NEXT: Record<
  Step,
  { step: Step; delay: "330m" | "18h" | "24h" } | null
> = {
  email_30m: { step: "email_6h", delay: "330m" },
  email_6h: { step: "whatsapp_24h", delay: "18h" },
  whatsapp_24h: { step: "human_48h", delay: "24h" },
  human_48h: null,
};

async function chainNext(payload: z.infer<typeof schema>) {
  const next = NEXT[payload.step];
  if (!next) return;

  await tasks.trigger<typeof checkoutRecoveryStep>(
    "checkout-recovery-step",
    { ...payload, step: next.step },
    {
      idempotencyKey: `checkout-recovery:${payload.sessionId}:${next.step}`,
      idempotencyKeyTTL: "7d",
      delay: next.delay,
      queue: "email",
    },
  );
}

export const checkoutRecoveryStep = schemaTask({
  id: "checkout-recovery-step",
  schema,
  queue: emailQueue,
  retry: {
    maxAttempts: 4,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 120_000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 60,
  run: async (payload) => {
    if (await customerHasPurchased(payload.email)) {
      logger.info("Checkout recovery stopped — already purchased", {
        sessionId: payload.sessionId,
        step: payload.step,
      });
      return { skipped: true, reason: "purchased" };
    }

    const offer = await resolveOffer(
      payload.promotionCode ?? LAUNCH_PROMOTION_CODE,
    );
    const checkoutUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout?promo=${encodeURIComponent(
      offer.promotionCode ?? LAUNCH_PROMOTION_CODE,
    )}`;
    const firstName = payload.name ? firstNameOf(payload.name) : undefined;

    if (payload.step === "email_30m" || payload.step === "email_6h") {
      try {
        await sendMail({
          channel: "client",
          to: payload.email,
          subject:
            payload.step === "email_30m"
              ? "Your spot is still open"
              : "Still thinking it over?",
          eligibility: { purpose: "lifecycle" },
          react: (
            <CheckoutRecoveryEmail
              firstName={firstName}
              variant={payload.step === "email_30m" ? "nudge" : "objection"}
              checkoutUrl={checkoutUrl}
              amountDueTodayLabel={offer.amountDueTodayLabel}
              renewalDisclosure={offer.renewalDisclosure}
              logoUrl={emailLogoSrc()}
            />
          ),
          idempotencyKey: `checkout-recovery-mail/${payload.sessionId}/${payload.step}`,
        });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "recovery email failed";
        if (isPermanentMailError(error)) {
          throw new AbortTaskRunError(detail);
        }
        throw error instanceof Error ? error : new Error(detail);
      }
    }

    if (payload.step === "whatsapp_24h") {
      const { checkChannelEligibility } = await import(
        "@/lib/funnel/eligibility"
      );
      const eligible = await checkChannelEligibility({
        channel: "whatsapp",
        email: payload.email,
        purpose: "lifecycle",
      });
      if (!eligible.eligible) {
        logger.info("Checkout recovery WhatsApp suppressed", {
          sessionId: payload.sessionId,
          reason: eligible.reason,
        });
      } else if (payload.whatsapp) {
        try {
          const { enqueueWhatsAppTemplate } = await import(
            "@/lib/whatsapp/enqueue"
          );
          await enqueueWhatsAppTemplate({
            toE164: payload.whatsapp,
            templateKey: "checkout_recovery",
            firstName: firstName ?? "there",
            purpose: "lifecycle",
            idempotencyKey: `wa:checkout-recovery:${payload.sessionId}`,
            buttonUrlParams: [
              `checkout?promo=${encodeURIComponent(
                offer.promotionCode ?? LAUNCH_PROMOTION_CODE,
              )}`,
            ],
          });
        } catch (error) {
          logger.warn("Checkout recovery Cloud WhatsApp enqueue failed", {
            sessionId: payload.sessionId,
            message: error instanceof Error ? error.message : "failed",
          });
        }

        if (
          env.GHL_SYNC_ENABLED === true ||
          String(env.GHL_SYNC_ENABLED) === "true"
        ) {
          try {
            const contact = await upsertGhlContact({
              email: payload.email,
              name: payload.name ?? payload.email,
              phone: payload.whatsapp,
              source: "Checkout Abandoned",
            });
            await addGhlTags(contact.contactId, [
              TAGS.checkoutAbandoned,
              TAGS.consentWhatsApp,
            ]);
          } catch (error) {
            logger.warn("Checkout recovery WhatsApp/GHL step failed", {
              sessionId: payload.sessionId,
              message: error instanceof Error ? error.message : "failed",
            });
          }
        }
      } else {
        logger.info("Checkout recovery WhatsApp step skipped (no phone)", {
          sessionId: payload.sessionId,
        });
      }
    }

    if (payload.step === "human_48h") {
      await db.staffTodo.create({
        data: {
          personKey: "lemoni",
          title: `Abandoned checkout follow-up: ${payload.email}`,
          source: "system",
          dueAt: new Date(),
          createdBy: "checkout-recovery",
        },
      });

      await db.alert.create({
        data: {
          ruleId: "checkout.abandoned.48h",
          severity: "p2",
          title: `Abandoned checkout needs human follow-up`,
          payload: {
            sessionId: payload.sessionId,
            email: payload.email,
            whatsapp: payload.whatsapp ?? null,
          },
          threadKey: `checkout-abandon:${payload.sessionId}`,
        },
      });
    }

    await chainNext(payload);
    return { skipped: false, step: payload.step };
  },
});
