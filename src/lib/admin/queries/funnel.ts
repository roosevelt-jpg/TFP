import "server-only";

import { db } from "@/db";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const x = startOfDay();
  x.setUTCDate(x.getUTCDate() - n);
  return x;
}

/** Spec §12.3 funnel metrics for admin Growth → Funnel. */
export async function getFunnelPageData() {
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    leads7,
    leads30,
    checkouts7,
    payments7,
    abandoned7,
    recoveries7,
    activations7,
    onboardingIncomplete,
    paymentFailed7,
    outboundFailed7,
    workflowsRunning,
    workflowsFailed,
  ] = await Promise.all([
    db.funnelEvent.count({
      where: { eventName: "lead_submitted", occurredAt: { gte: since7 } },
    }),
    db.funnelEvent.count({
      where: { eventName: "lead_submitted", occurredAt: { gte: since30 } },
    }),
    db.funnelEvent.count({
      where: { eventName: "checkout_started", occurredAt: { gte: since7 } },
    }),
    db.funnelEvent.count({
      where: { eventName: "payment_succeeded", occurredAt: { gte: since7 } },
    }),
    db.funnelEvent.count({
      where: {
        eventName: { in: ["checkout_abandoned", "checkout_expired"] },
        occurredAt: { gte: since7 },
      },
    }),
    db.outboundMessage.count({
      where: {
        templateId: { contains: "recovery" },
        status: "sent",
        createdAt: { gte: since7 },
      },
    }),
    db.funnelEvent.count({
      where: { eventName: "programme_activated", occurredAt: { gte: since7 } },
    }),
    db.funnelEvent.count({
      where: {
        eventName: "onboarding_incomplete",
        occurredAt: { gte: since7 },
      },
    }),
    db.funnelEvent.count({
      where: { eventName: "payment_failed", occurredAt: { gte: since7 } },
    }),
    db.outboundMessage.count({
      where: { status: "failed", createdAt: { gte: since7 } },
    }),
    db.workflowExecution.count({ where: { state: "running" } }),
    db.workflowExecution.count({
      where: { state: { in: ["failed", "stopped"] }, updatedAt: { gte: since7 } },
    }),
  ]);

  const landingToCheckout =
    leads7 > 0 ? Math.round((checkouts7 / leads7) * 1000) / 10 : null;
  const checkoutToPay =
    checkouts7 > 0 ? Math.round((payments7 / checkouts7) * 1000) / 10 : null;
  const recoveryRate =
    abandoned7 > 0 ? Math.round((recoveries7 / abandoned7) * 1000) / 10 : null;
  const activationRate =
    payments7 > 0 ? Math.round((activations7 / payments7) * 1000) / 10 : null;

  const recent = await db.funnelEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take: 25,
  });

  return {
    window: "7d",
    kpis: {
      leads7,
      leads30,
      checkouts7,
      payments7,
      abandoned7,
      recoveries7,
      activations7,
      onboardingIncomplete,
      paymentFailed7,
      outboundFailed7,
      workflowsRunning,
      workflowsFailed,
      landingToCheckoutPct: landingToCheckout,
      checkoutToPayPct: checkoutToPay,
      recoveryRatePct: recoveryRate,
      activationRatePct: activationRate,
    },
    recent,
  };
}
