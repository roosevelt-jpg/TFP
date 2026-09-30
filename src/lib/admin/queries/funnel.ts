import "server-only";

import { db } from "@/db";
import { loadFunnelMetrics } from "@/lib/funnel/metrics";

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
  const [metrics, recent] = await Promise.all([
    loadFunnelMetrics(since7),
    db.funnelEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 25,
    }),
  ]);

  return { window: "7d" as const, metrics, recent };
}
