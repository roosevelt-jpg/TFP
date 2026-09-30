import "server-only";

import { loadFunnelMetrics } from "@/lib/funnel/metrics";

function line(label: string, value: string | number | null) {
  return `${label}: ${value ?? "—"}`;
}

/** Spec §12.2 — one owner digest. Pure formatting so tests do not need the database. */
export function formatFunnelDigest(
  metrics: Awaited<ReturnType<typeof loadFunnelMetrics>>,
  label: string,
) {
  const sources =
    metrics.leadSources.length === 0
      ? "none"
      : metrics.leadSources.map((row) => `${row.source} ${row.count}`).join(", ");
  const delivery =
    metrics.delivery.length === 0
      ? "none"
      : metrics.delivery
          .map((row) => `${row.channel} ${row.pct ?? "—"}%`)
          .join(", ");

  return [
    `<b>Funnel digest</b> ${label}`,
    line("New leads", metrics.leads),
    line("Source mix", sources),
    line("Checkout starts", metrics.checkoutStarters),
    line("Purchases", metrics.purchasers),
    line("Abandoned", metrics.abandoned),
    line("Recovered", metrics.recovered),
    line("Activations within 24h", metrics.activatedWithin24h),
    line("Awaiting human reply", metrics.sla.awaiting),
    line("Delivery failures", metrics.deliveryFailures),
    line("Suppressed sends", metrics.suppressed),
    line("Delivery health", delivery),
    line("Upcoming renewals", metrics.upcomingRenewals),
    line("Cancellation intent", metrics.cancellations),
    line("Open incidents", metrics.openIncidents),
  ].join("\n");
}

export async function buildFunnelDailyDigest(now = new Date()) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const metrics = await loadFunnelMetrics(since);
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
  }).format(now);
  return formatFunnelDigest(metrics, label);
}
