import type Stripe from "stripe";

// What the webhook route should do with an event, decided without any I/O so
// the decision is unit-testable on its own.
//
// handle  -> a programme event we act on
// skip    -> verified and recorded, but deliberately no action. The account is
//            shared with a Shopify supplement catalog, so most traffic is other
//            people's orders; skipping is the common path, not an edge case.
export type EventDecision =
  | { action: "handle"; kind: HandledEventKind }
  | { action: "skip"; reason: SkipReason };

export type HandledEventKind =
  | "checkout.completed"
  | "checkout.async_succeeded"
  | "checkout.async_failed"
  | "checkout.expired"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.payment_action_required"
  | "invoice.finalization_failed"
  | "subscription.changed"
  | "subscription.deleted"
  | "subscription.trial_will_end"
  | "charge.refunded"
  | "dispute.created";

export type SkipReason = "unhandled_type";

// Registered on the webhook endpoint so most supplement traffic never reaches
// us. Anything outside this list that still arrives is skipped by routeEvent.
export const SUBSCRIBED_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.finalization_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "charge.refunded",
  "charge.dispute.created",
] as const satisfies readonly Stripe.Event["type"][];

export function routeEvent(event: Stripe.Event): EventDecision {
  switch (event.type) {
    case "checkout.session.completed":
      return { action: "handle", kind: "checkout.completed" };
    case "checkout.session.async_payment_succeeded":
      return { action: "handle", kind: "checkout.async_succeeded" };
    case "checkout.session.async_payment_failed":
      return { action: "handle", kind: "checkout.async_failed" };
    case "checkout.session.expired":
      return { action: "handle", kind: "checkout.expired" };

    case "invoice.paid":
      return { action: "handle", kind: "invoice.paid" };
    case "invoice.payment_failed":
      return { action: "handle", kind: "invoice.payment_failed" };
    case "invoice.payment_action_required":
      return { action: "handle", kind: "invoice.payment_action_required" };
    case "invoice.finalization_failed":
      return { action: "handle", kind: "invoice.finalization_failed" };

    // created and updated collapse to one kind: the handler re-fetches canonical
    // state from Stripe rather than diffing the payload, so which event woke it
    // doesn't matter.
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return { action: "handle", kind: "subscription.changed" };
    case "customer.subscription.deleted":
      return { action: "handle", kind: "subscription.deleted" };
    case "customer.subscription.trial_will_end":
      return { action: "handle", kind: "subscription.trial_will_end" };

    case "charge.refunded":
      return { action: "handle", kind: "charge.refunded" };
    case "charge.dispute.created":
      return { action: "handle", kind: "dispute.created" };

    default:
      return { action: "skip", reason: "unhandled_type" };
  }
}
