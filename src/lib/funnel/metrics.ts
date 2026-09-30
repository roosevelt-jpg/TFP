import "server-only";

import { db } from "@/db";
import {
  activatedWithin24h,
  attributionCoverage,
  deliveryHealth,
  humanResponseMinutes,
  rate,
  recoveredPurchasers,
  uniqueIds,
} from "@/lib/funnel/metrics-math";

export {
  activatedWithin24h,
  attributionCoverage,
  deliveryHealth,
  humanResponseMinutes,
  rate,
  recoveredPurchasers,
  uniqueIds,
};

export async function loadFunnelMetrics(since: Date) {
  const [
    landingGroups,
    leadGroups,
    checkoutGroups,
    payments,
    abandoned,
    activations,
    outbound,
    threads,
    openIncidents,
    upcomingRenewals,
    cancellations,
  ] = await Promise.all([
    db.funnelEvent.groupBy({
      by: ["sessionId"],
      where: {
        eventName: "landing_view",
        occurredAt: { gte: since },
        NOT: { sessionId: null },
      },
    }),
    db.funnelEvent.groupBy({
      by: ["waitlistId"],
      where: {
        eventName: "lead_submitted",
        occurredAt: { gte: since },
        NOT: { waitlistId: null },
      },
    }),
    db.funnelEvent.groupBy({
      by: ["sessionId"],
      where: {
        eventName: "checkout_started",
        occurredAt: { gte: since },
        NOT: { sessionId: null },
      },
    }),
    db.funnelEvent.findMany({
      where: { eventName: "payment_succeeded", occurredAt: { gte: since } },
      select: { customerId: true, occurredAt: true, properties: true },
    }),
    db.funnelEvent.findMany({
      where: {
        eventName: { in: ["checkout_abandoned", "checkout_expired"] },
        occurredAt: { gte: since },
      },
      select: { customerId: true },
    }),
    db.funnelEvent.findMany({
      where: { eventName: "programme_activated", occurredAt: { gte: since } },
      select: { customerId: true, occurredAt: true },
    }),
    db.outboundMessage.groupBy({
      by: ["channel", "status"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.leadThread.findMany({
      where: { lastInboundAt: { gte: since } },
      select: { lastInboundAt: true, lastReplyAt: true },
    }),
    db.alert.count({ where: { status: "open" } }),
    db.funnelEvent.count({
      where: { eventName: "renewal_approaching", occurredAt: { gte: since } },
    }),
    db.funnelEvent.count({
      where: { eventName: "subscription_cancelled", occurredAt: { gte: since } },
    }),
  ]);

  const landingSessions = landingGroups.length;
  const leads = leadGroups.length;
  const checkoutStarters = checkoutGroups.length;
  const purchasers = payments.length;
  const abandonedCount = uniqueIds(abandoned.map((row) => row.customerId));
  const recovered = recoveredPurchasers(
    abandoned.map((row) => row.customerId),
    payments.map((row) => ({ customerId: row.customerId, at: row.occurredAt })),
  );
  const activated = activatedWithin24h(
    payments.map((row) => ({ customerId: row.customerId, at: row.occurredAt })),
    activations.map((row) => ({ customerId: row.customerId, at: row.occurredAt })),
  );
  const attribution = attributionCoverage(payments);
  const delivery = deliveryHealth(
    outbound.map((row) => ({
      channel: row.channel,
      status: row.status,
      count: row._count._all,
    })),
  );
  const sla = humanResponseMinutes(threads);

  const leadSources = await db.funnelEvent.groupBy({
    by: ["source"],
    where: { eventName: "lead_submitted", occurredAt: { gte: since } },
    _count: { _all: true },
  });

  return {
    landingSessions,
    leads,
    leadSources: leadSources.map((row) => ({
      source: row.source,
      count: row._count._all,
    })),
    checkoutStarters,
    purchasers,
    abandoned: abandonedCount,
    recovered,
    activatedWithin24h: activated,
    landingToCheckoutPct: rate(checkoutStarters, landingSessions),
    checkoutCompletionPct: rate(purchasers, checkoutStarters),
    leadCapturePct: rate(leads, landingSessions),
    recoveryConversionPct: rate(recovered, abandonedCount),
    activationRatePct: rate(activated, purchasers),
    attribution,
    delivery,
    sla,
    openIncidents,
    upcomingRenewals,
    cancellations,
    suppressed: outbound
      .filter((row) => row.status === "suppressed")
      .reduce((sum, row) => sum + row._count._all, 0),
    deliveryFailures: outbound
      .filter((row) => row.status === "failed" || row.status === "bounced")
      .reduce((sum, row) => sum + row._count._all, 0),
  };
}
