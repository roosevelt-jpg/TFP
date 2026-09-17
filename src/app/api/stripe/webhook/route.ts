import type Stripe from "stripe";

import {
  getStripe,
  getStripeWebhookSecret,
  stripeKeyIsLive,
} from "@/lib/clients/stripe";
import { logger } from "@/lib/logger";
import {
  type HandleOutcome,
  handleStripeEvent,
} from "@/lib/stripe-events/handle-event";
import {
  markStripeEventStatus,
  recordStripeEvent,
} from "@/lib/stripe-events/persist-event";
import { routeEvent } from "@/lib/stripe-events/router";
import { StripeEventStatus } from "@/generated/prisma/enums";

// Stripe waits up to 10s for this endpoint before redirecting a paying customer
// to the success page, and a slow response to invoice.created delays invoice
// finalization for up to 72h. So: verify, persist, ack. Real work belongs in a
// queued task, never in the request path.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw text, never request.json(): any reserialisation changes the bytes and
  // breaks signature verification.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = await getStripe();
    const webhookSecret = await getStripeWebhookSecret();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    // Bad signature or a stale timestamp. Never processed, never persisted —
    // an unverified payload is attacker-controlled.
    logger.warn("Stripe webhook signature verification failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Compared against the KEY's mode, not PAYMENTS_LIVE: that flag controls when
  // the checkout routes go public, and is deliberately false while testing with
  // live keys. The key is what decides which dataset we'd be writing to.
  //
  // A test event reaching live data would create fake customers and fire real
  // emails. 200 so Stripe stops retrying something we will never accept.
  const keyIsLive = await stripeKeyIsLive();
  if (event.livemode !== keyIsLive) {
    logger.error("Stripe webhook livemode mismatch", undefined, {
      stripeEventId: event.id,
      type: event.type,
      eventLivemode: event.livemode,
      keyIsLive,
    });
    return Response.json({ received: true, ignored: "livemode" });
  }

  const outcome = await recordStripeEvent(event);
  if (!outcome.proceed) {
    return Response.json({ received: true, duplicate: true });
  }

  const decision = routeEvent(event);

  if (decision.action === "skip") {
    await markStripeEventStatus(event.id, StripeEventStatus.skipped);
    return Response.json({ received: true, skipped: decision.reason });
  }

  let handled: HandleOutcome;
  try {
    handled = await handleStripeEvent(event, decision.kind);
  } catch (error) {
    // 500 on purpose: Stripe retries, and the row stays `failed` so redrive can
    // replay it if the retries run out.
    await markStripeEventStatus(
      event.id,
      StripeEventStatus.failed,
      error instanceof Error ? error.message : "unknown",
    );
    logger.error("Stripe event handler failed", error, {
      stripeEventId: event.id,
      type: event.type,
      kind: decision.kind,
    });
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  await markStripeEventStatus(
    event.id,
    handled === "handled"
      ? StripeEventStatus.processed
      : StripeEventStatus.received,
  );

  return Response.json({ received: true });
}
