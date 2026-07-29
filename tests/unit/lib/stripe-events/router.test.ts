import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  type HandledEventKind,
  routeEvent,
  SUBSCRIBED_EVENT_TYPES,
} from "@/lib/stripe-events/router";

function eventOf(type: string): Stripe.Event {
  return {
    id: `evt_${type.replace(/\W/g, "_")}`,
    type,
    created: 1_700_000_000,
    livemode: false,
    api_version: null,
    pending_webhooks: 0,
    request: null,
    object: "event",
    data: { object: {} },
  } as unknown as Stripe.Event;
}

describe("routeEvent", () => {
  it.each([
    ["checkout.session.completed", "checkout.completed"],
    ["checkout.session.async_payment_succeeded", "checkout.async_succeeded"],
    ["checkout.session.async_payment_failed", "checkout.async_failed"],
    ["checkout.session.expired", "checkout.expired"],
    ["invoice.paid", "invoice.paid"],
    ["invoice.payment_failed", "invoice.payment_failed"],
    ["invoice.payment_action_required", "invoice.payment_action_required"],
    ["invoice.finalization_failed", "invoice.finalization_failed"],
    ["customer.subscription.deleted", "subscription.deleted"],
    ["customer.subscription.trial_will_end", "subscription.trial_will_end"],
    ["charge.refunded", "charge.refunded"],
    ["charge.dispute.created", "dispute.created"],
  ])("routes %s to %s", (type, kind) => {
    expect(routeEvent(eventOf(type))).toEqual({
      action: "handle",
      kind: kind as HandledEventKind,
    });
  });

  // Both wake the same handler, which re-fetches canonical state rather than
  // diffing the payload — so the distinction is deliberately erased here.
  it("collapses subscription created and updated to one kind", () => {
    expect(routeEvent(eventOf("customer.subscription.created"))).toEqual({
      action: "handle",
      kind: "subscription.changed",
    });
    expect(routeEvent(eventOf("customer.subscription.updated"))).toEqual({
      action: "handle",
      kind: "subscription.changed",
    });
  });

  // The account is shared with a Shopify supplement catalog, so unrelated
  // traffic is expected and must never be mistaken for a programme event.
  it.each([
    "product.created",
    "price.updated",
    "payout.paid",
    "charge.succeeded",
    "customer.created",
    "payment_intent.succeeded",
  ])("skips unrelated event %s", (type) => {
    expect(routeEvent(eventOf(type))).toEqual({
      action: "skip",
      reason: "unhandled_type",
    });
  });

  it("skips an event type invented after this SDK version", () => {
    expect(routeEvent(eventOf("some.future.event"))).toEqual({
      action: "skip",
      reason: "unhandled_type",
    });
  });
});

describe("SUBSCRIBED_EVENT_TYPES", () => {
  it("has no duplicates", () => {
    expect(new Set(SUBSCRIBED_EVENT_TYPES).size).toBe(
      SUBSCRIBED_EVENT_TYPES.length,
    );
  });

  // The registered list and the router must agree: a type registered but not
  // routed wastes deliveries, and a type routed but not registered never
  // arrives — the silent-failure case that loses a payment event.
  it("is exactly the set of types the router handles", () => {
    for (const type of SUBSCRIBED_EVENT_TYPES) {
      expect(routeEvent(eventOf(type)).action).toBe("handle");
    }
  });
});
