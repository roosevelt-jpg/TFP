import type Stripe from "stripe";

// Everything fulfillment needs from a Checkout Session, flattened. Pure, so the
// mapping is testable without Stripe or a database.
export type SessionDetails = {
  sessionId: string;
  createdAt: number;
  stripeCustomerId: string;
  email: string;
  name: string;
  whatsapp: string;
  consentText: string;
  policyVersion: string;
  waitlistId: string | null;
  // Minted at checkout, shared with the browser pixel so a server-side twin
  // added later deduplicates against it.
  eventId: string | null;
  amountTotal: number;
  discountTotal: number;
  currency: string;
  promoCode: string | null;
  subscription: Stripe.Subscription | null;
  // The £149 rides the first invoice. dahlia severed every direct link between
  // a charge and its invoice, so the payment intent is what a later refund
  // matches on.
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
};

// Null when the session can't produce a Customer. The caller alerts rather than
// writing a half-formed record.
export function readSessionDetails(
  session: Stripe.Checkout.Session,
): SessionDetails | null {
  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const email = session.customer_details?.email ?? session.customer_email;
  const metadata = session.metadata ?? {};

  if (!stripeCustomerId || !email || !metadata.name || !metadata.whatsapp) {
    return null;
  }

  return {
    sessionId: session.id,
    createdAt: session.created,
    stripeCustomerId,
    email,
    name: metadata.name,
    // Ours, not customer_details.phone: this one is already E.164 and schema
    // validated. Stripe's is collected so GHL can match the contact.
    whatsapp: metadata.whatsapp,
    consentText: metadata.consentText ?? "",
    policyVersion: metadata.policyVersion ?? "",
    waitlistId: metadata.waitlistId ?? null,
    eventId: metadata.eventId ?? null,
    amountTotal: session.amount_total ?? 0,
    discountTotal: session.total_details?.amount_discount ?? 0,
    currency: session.currency ?? "gbp",
    promoCode: readPromoCode(session),
    stripeInvoiceId:
      typeof session.invoice === "string"
        ? session.invoice
        : (session.invoice?.id ?? null),
    stripePaymentIntentId: readPaymentIntentId(session),
    subscription:
      session.subscription && typeof session.subscription !== "string"
        ? session.subscription
        : null,
  };
}

// In subscription mode session.payment_intent is always null: the money rides
// the first invoice, so the intent hangs off its payments list.
function readPaymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.invoice !== "object" || !session.invoice) return null;

  for (const payment of session.invoice.payments?.data ?? []) {
    const target = payment.payment;
    if (target && typeof target === "object" && "payment_intent" in target) {
      const intent = target.payment_intent;
      if (typeof intent === "string") return intent;
      if (intent && typeof intent === "object") return intent.id;
    }
  }

  return null;
}

function readPromoCode(session: Stripe.Checkout.Session): string | null {
  const promotion = session.discounts?.[0]?.promotion_code;
  if (!promotion) return null;
  return typeof promotion === "string" ? promotion : promotion.code;
}
