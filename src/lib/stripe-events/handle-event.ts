import "server-only";

import type Stripe from "stripe";

import { logger } from "@/lib/logger";
import { fulfillCheckout } from "@/lib/payments/fulfill-checkout";

import { handleChargeRefunded, handleDisputeCreated } from "./handlers/charges";
import {
  handleInvoiceActionRequired,
  handleInvoiceFinalizationFailed,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "./handlers/invoices";
import {
  handleSubscriptionChanged,
  handleSubscriptionDeleted,
  handleTrialWillEnd,
} from "./handlers/subscriptions";
import type { HandledEventKind } from "./router";

// deferred = subscribed to, but its handler ships in a later phase. Recorded
// distinctly from `handled` so redrive can find it once that handler exists.
export type HandleOutcome = "handled" | "deferred";

// Runs in the webhook request, so everything here must be fast. A failing
// endpoint delays Stripe finalizing invoices for up to 72h, which would stop
// customers being charged at all.
export async function handleStripeEvent(
  event: Stripe.Event,
  kind: HandledEventKind,
): Promise<HandleOutcome> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillCheckout(event.data.object.id, event.created);
      return "handled";

    case "invoice.paid":
      await handleInvoicePaid(event.data.object, event.created);
      return "handled";

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object, event.created);
      return "handled";

    case "invoice.payment_action_required":
      await handleInvoiceActionRequired(event.data.object, event.created);
      return "handled";

    case "invoice.finalization_failed":
      handleInvoiceFinalizationFailed(event.data.object);
      return "handled";

    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChanged(event.data.object, event.created);
      return "handled";

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, event.created);
      return "handled";

    case "customer.subscription.trial_will_end":
      await handleTrialWillEnd(event.data.object, event.created);
      return "handled";

    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      return "handled";

    case "charge.dispute.created":
      handleDisputeCreated(event.data.object);
      return "handled";

    // Comms and analytics ship in a later phase, so these stay findable for
    // redrive rather than looking like finished work.
    default:
      logger.info("Stripe event recorded, handler pending", {
        stripeEventId: event.id,
        type: event.type,
        kind,
      });
      return "deferred";
  }
}
