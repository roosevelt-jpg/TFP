import { PrismaPg } from "@prisma/adapter-pg";
import type Stripe from "stripe";

import { PrismaClient } from "@/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Integration tests need a real DATABASE_URL. Run them with `pnpm test:integration`.",
  );
}

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Every fixture carries this marker so cleanup can never touch real rows.
export const MARKER = "itest";

export async function resetFixtures(): Promise<void> {
  await db.subscription.deleteMany({
    where: { customer: { email: { contains: MARKER } } },
  });
  await db.purchase.deleteMany({
    where: { customer: { email: { contains: MARKER } } },
  });
  await db.coachingProfile.deleteMany({
    where: { customer: { email: { contains: MARKER } } },
  });
  await db.customer.deleteMany({ where: { email: { contains: MARKER } } });
  await db.stripeEvent.deleteMany({ where: { id: { contains: MARKER } } });
}

let counter = 0;
export const uniq = (prefix: string) => `${prefix}_${MARKER}_${counter++}`;

type SessionOverrides = {
  id?: string;
  customer?: string;
  email?: string;
  whatsapp?: string;
  name?: string;
  amountTotal?: number;
  paymentStatus?: Stripe.Checkout.Session.PaymentStatus;
  status?: Stripe.Checkout.Session.Status;
  subscription?: Stripe.Subscription | null;
  createdAt?: number;
  promoCode?: string;
  discountTotal?: number;
  invoiceId?: string;
};

// Shaped like a retrieved Checkout Session, with only the fields fulfillment
// reads. Cast-free by construction: readSessionDetails takes the real type, so
// anything missing here is a compile error the moment it starts being read.
export function checkoutSession(
  overrides: SessionOverrides = {},
): Stripe.Checkout.Session {
  const session = {
    id: overrides.id ?? uniq("cs"),
    object: "checkout.session",
    created: overrides.createdAt ?? Math.floor(Date.now() / 1000),
    status: overrides.status ?? "complete",
    payment_status: overrides.paymentStatus ?? "paid",
    customer: overrides.customer ?? uniq("cus"),
    customer_email: overrides.email ?? `buyer_${MARKER}@example.com`,
    customer_details: {
      email: overrides.email ?? `buyer_${MARKER}@example.com`,
      phone: null,
    },
    amount_total: overrides.amountTotal ?? 14900,
    currency: "gbp",
    total_details: { amount_discount: overrides.discountTotal ?? 0 },
    // Shaped as Stripe returns it with discounts.promotion_code expanded.
    discounts: overrides.promoCode
      ? [{ promotion_code: { id: "promo_test", code: overrides.promoCode } }]
      : [],
    metadata: {
      name: overrides.name ?? "Kane Mousah",
      whatsapp: overrides.whatsapp ?? "+447700900000",
      consentText: "I confirm I am 16 or over",
      policyVersion: "2026-07-26",
      eventId: uniq("evt"),
    },
    subscription: overrides.subscription ?? null,
    invoice: overrides.invoiceId ?? null,
  };

  return session as unknown as Stripe.Checkout.Session;
}

type SubscriptionOverrides = {
  id?: string;
  status?: Stripe.Subscription.Status;
  priceId?: string;
  trialEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: number | null;
  customer?: string;
};

export function subscription(
  overrides: SubscriptionOverrides = {},
): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000);
  const sub = {
    id: overrides.id ?? uniq("sub"),
    object: "subscription",
    customer: overrides.customer ?? uniq("cus"),
    status: overrides.status ?? "trialing",
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    canceled_at: overrides.canceledAt ?? null,
    trial_end:
      overrides.trialEnd === undefined ? now + 56 * 86400 : overrides.trialEnd,
    items: {
      data: [
        {
          price: { id: overrides.priceId ?? "price_membership_79" },
          current_period_start: now,
          current_period_end: now + 56 * 86400,
        },
      ],
    },
  };

  return sub as unknown as Stripe.Subscription;
}
