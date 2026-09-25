import "server-only";

import { resolveSecret } from "@/lib/secrets/store";

const TOLERANCE_PENCE = 100; // ±£1
const WINDOW_DAYS = 2;

export type StripePayout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: Date;
  created: Date;
};

type StripePayoutApiRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
  created: number;
};

/**
 * Live Stripe payouts list (`GET /v1/payouts`).
 * Returns null when STRIPE_SECRET_KEY is missing (caller falls back to warehouse).
 */
export async function fetchStripePayouts(opts?: {
  limit?: number;
  /** Unix seconds — only payouts created on/after this. */
  createdGte?: number;
}): Promise<StripePayout[] | null> {
  const key = await resolveSecret("STRIPE_SECRET_KEY");
  if (!key) return null;

  const params = new URLSearchParams({
    limit: String(opts?.limit ?? 100),
  });
  if (opts?.createdGte != null) {
    params.set("created[gte]", String(opts.createdGte));
  }

  const res = await fetch(
    `https://api.stripe.com/v1/payouts?${params.toString()}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Stripe payouts ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: StripePayoutApiRow[] };
  return (json.data ?? []).map((row) => ({
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    arrivalDate: new Date(row.arrival_date * 1000),
    created: new Date(row.created * 1000),
  }));
}

function withinDateWindow(payoutDate: Date, txnDate: Date): boolean {
  const from = new Date(txnDate);
  from.setUTCDate(from.getUTCDate() - WINDOW_DAYS);
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(txnDate);
  to.setUTCDate(to.getUTCDate() + WINDOW_DAYS + 1);
  to.setUTCHours(0, 0, 0, 0);
  const t = payoutDate.getTime();
  return t >= from.getTime() && t < to.getTime();
}

/**
 * Match a FinanceTxn PAYOUT_STRIPE amount (pence) to a live Stripe payout
 * amount (cents) within ±£1 and ±2 days (arrival_date preferred, else created).
 */
export async function matchLiveStripePayout(input: {
  amountPence: number;
  date: Date;
  currency: string;
}): Promise<{
  matched: boolean;
  payout?: StripePayout;
  deltaPence?: number;
  /** False when key missing — use warehouse. */
  attempted: boolean;
}> {
  const lookback = new Date(input.date);
  lookback.setUTCDate(lookback.getUTCDate() - WINDOW_DAYS - 7);
  const payouts = await fetchStripePayouts({
    limit: 100,
    createdGte: Math.floor(lookback.getTime() / 1000),
  });
  if (payouts == null) {
    return { matched: false, attempted: false };
  }

  const currency = input.currency.toLowerCase();
  let best: { payout: StripePayout; delta: number } | null = null;

  for (const payout of payouts) {
    if (payout.currency.toLowerCase() !== currency) continue;
    if (payout.status === "canceled" || payout.status === "failed") continue;
    const dateOk =
      withinDateWindow(payout.arrivalDate, input.date) ||
      withinDateWindow(payout.created, input.date);
    if (!dateOk) continue;

    const delta = Math.abs(payout.amount - input.amountPence);
    if (delta > TOLERANCE_PENCE) continue;
    if (!best || delta < best.delta) {
      best = { payout, delta };
    }
  }

  if (!best) {
    return { matched: false, attempted: true };
  }

  return {
    matched: true,
    payout: best.payout,
    deltaPence: best.delta,
    attempted: true,
  };
}
