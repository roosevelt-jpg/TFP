import "server-only";

import type Stripe from "stripe";

import { db } from "@/db";
import { logger } from "@/lib/logger";
import { markPurchaseRefunded } from "@/lib/payments/persist-refund";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

// The client's policy is that a refunded customer keeps their access, so this
// records the money and nothing else.
export async function handleChargeRefunded(
  charge: Stripe.Charge,
): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);

  if (!paymentIntentId) return;

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const purchaseRef = await markPurchaseRefunded({
    stripePaymentIntentId: paymentIntentId,
    fullyRefunded,
  });

  // No match means a Shopify order or a hand-sold tier, which is expected
  // traffic on this shared account.
  if (!purchaseRef) return;

  logger.info("Purchase refunded", {
    purchaseRef,
    amountRefunded: charge.amount_refunded,
    fullyRefunded,
  });
}

// Money is being pulled back and there is a deadline to respond, so this exists
// to put a human in the loop rather than to change any state.
export async function handleDisputeCreated(
  dispute: Stripe.Dispute,
): Promise<void> {
  const dueBy = dispute.evidence_details?.due_by ?? null;
  logger.error("Payment disputed", undefined, {
    disputeId: dispute.id,
    amount: dispute.amount,
    reason: dispute.reason,
    evidenceDueBy: dueBy,
  });

  const threadKey = `dispute:${dispute.id}`;
  const existing = await db.alert.findFirst({
    where: { threadKey, status: { in: ["open", "acknowledged"] } },
  });
  if (!existing) {
    await db.alert.create({
      data: {
        ruleId: "PY-DISPUTE",
        severity: "p1",
        title: `Payment disputed — ${dispute.reason ?? dispute.id}`,
        payload: {
          disputeId: dispute.id,
          amount: dispute.amount,
          currency: dispute.currency,
          reason: dispute.reason,
          evidenceDueBy: dueBy,
        },
        threadKey,
      },
    });
  }

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    const pounds = ((dispute.amount ?? 0) / 100).toFixed(2);
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: `P1 · Payment disputed ${dispute.id} · £${pounds} · ${dispute.reason ?? "unspecified"}. Evidence due ${dueBy ? new Date(dueBy * 1000).toISOString() : "unknown"}.`,
    });
  }
}
