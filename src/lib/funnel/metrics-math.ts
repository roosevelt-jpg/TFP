export type Rate = number | null;

export function rate(part: number, whole: number): Rate {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export function uniqueIds(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

type Timed = { customerId: string | null; at: Date };

export function activatedWithin24h(payments: Timed[], activations: Timed[]) {
  let count = 0;
  for (const payment of payments) {
    if (!payment.customerId) continue;
    const hit = activations.some(
      (activation) =>
        activation.customerId === payment.customerId &&
        activation.at.getTime() >= payment.at.getTime() &&
        activation.at.getTime() - payment.at.getTime() <= 24 * 60 * 60 * 1000,
    );
    if (hit) count += 1;
  }
  return count;
}

export function recoveredPurchasers(
  abandonedCustomerIds: Array<string | null>,
  payments: Timed[],
) {
  const abandoned = new Set(
    abandonedCustomerIds.filter((id): id is string => Boolean(id)),
  );
  const recovered = new Set<string>();
  for (const payment of payments) {
    if (payment.customerId && abandoned.has(payment.customerId)) {
      recovered.add(payment.customerId);
    }
  }
  return recovered.size;
}

export function attributionCoverage(payments: Array<{ properties: unknown }>) {
  const covered = payments.filter((payment) => {
    const props = payment.properties;
    if (!props || typeof props !== "object" || Array.isArray(props)) return false;
    const record = props as Record<string, unknown>;
    const source = record.acquisitionSource ?? record.source;
    return Boolean(record.funnelVersion) && Boolean(source);
  }).length;
  return { covered, total: payments.length, pct: rate(covered, payments.length) };
}

export function deliveryHealth(
  rows: Array<{ channel: string; status: string; count: number }>,
) {
  const byChannel = new Map<string, { accepted: number; delivered: number }>();
  for (const row of rows) {
    const current = byChannel.get(row.channel) ?? { accepted: 0, delivered: 0 };
    if (row.status === "delivered" || row.status === "opened") {
      current.delivered += row.count;
      current.accepted += row.count;
    } else if (
      row.status === "sent" ||
      row.status === "failed" ||
      row.status === "bounced" ||
      row.status === "delayed"
    ) {
      current.accepted += row.count;
    }
    byChannel.set(row.channel, current);
  }
  return [...byChannel.entries()].map(([channel, counts]) => ({
    channel,
    ...counts,
    pct: rate(counts.delivered, counts.accepted),
  }));
}

export function humanResponseMinutes(
  threads: Array<{ lastInboundAt: Date | null; lastReplyAt: Date | null }>,
) {
  const minutes: number[] = [];
  let awaiting = 0;
  for (const thread of threads) {
    if (!thread.lastInboundAt) continue;
    if (!thread.lastReplyAt || thread.lastReplyAt < thread.lastInboundAt) {
      awaiting += 1;
      continue;
    }
    minutes.push(
      (thread.lastReplyAt.getTime() - thread.lastInboundAt.getTime()) / 60000,
    );
  }
  const average =
    minutes.length === 0
      ? null
      : Math.round(
          minutes.reduce((sum, value) => sum + value, 0) / minutes.length,
        );
  return { averageMinutes: average, answered: minutes.length, awaiting };
}
