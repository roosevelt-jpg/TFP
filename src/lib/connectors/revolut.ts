import "server-only";

import { db } from "@/db";
import { resolveSecret } from "@/lib/secrets/store";

function startOfUtcToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Sum GBP CashBalance rows into today's DailySnapshot for CA1/CA2 + Finance. */
export async function syncCashBalancesToDailySnapshot() {
  const cash = await db.cashBalance.findMany({
    where: { currency: "gbp" },
  });
  const cashBalancePence = cash.reduce((s, c) => s + c.balanceMinor, 0);
  const date = startOfUtcToday();
  const existing = await db.dailySnapshot.findUnique({ where: { date } });
  const prevPayload =
    existing?.payload && typeof existing.payload === "object"
      ? (existing.payload as Record<string, unknown>)
      : {};

  await db.dailySnapshot.upsert({
    where: { date },
    create: {
      date,
      cashBalancePence,
      label: "calculated",
      payload: {
        cashSyncedAt: new Date().toISOString(),
        cashSource: "cash_balance_sync",
      },
    },
    update: {
      cashBalancePence,
      payload: {
        ...prevPayload,
        cashSyncedAt: new Date().toISOString(),
        cashSource: "cash_balance_sync",
      },
    },
  });

  return { date, cashBalancePence, accounts: cash.length };
}

/** Revolut Business balances — Phase 5 read-only cash feed into Finance + DailySnapshot. */
export async function pullRevolutBalances() {
  const token = await resolveSecret("REVOLUT_API_TOKEN");
  if (!token) {
    await db.connectorRun.update({
      where: { sourceId: "S12" },
      data: {
        lastRunAt: new Date(),
        lastError: "REVOLUT_API_TOKEN not configured",
        status: "phased",
      },
    });
    return { skipped: true as const };
  }

  const res = await fetch("https://b2b.revolut.com/api/1.0/accounts", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    await db.connectorRun.update({
      where: { sourceId: "S12" },
      data: {
        lastRunAt: new Date(),
        lastError: `HTTP ${res.status}`,
        status: "error",
      },
    });
    throw new Error(`Revolut pull failed: ${res.status}`);
  }

  const accounts = (await res.json()) as Array<{
    id: string;
    name?: string;
    currency: string;
    balance: number;
  }>;

  for (const account of accounts) {
    const name = `Revolut ${account.currency.toUpperCase()}${account.name ? ` · ${account.name}` : ""}`;
    await db.cashBalance.upsert({
      where: { account: name },
      create: {
        account: name,
        currency: account.currency.toLowerCase(),
        balanceMinor: Math.round(account.balance * 100),
        label: "verified",
        recordedAt: new Date(),
      },
      update: {
        balanceMinor: Math.round(account.balance * 100),
        label: "verified",
        recordedAt: new Date(),
      },
    });
  }

  // CA1/CA2 read DailySnapshot.cashBalancePence; Money page reads CashBalance.
  const snap = await syncCashBalancesToDailySnapshot();

  await db.connectorRun.update({
    where: { sourceId: "S12" },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      status: "healthy",
      scheduleNote: `Cash snapshot £${(snap.cashBalancePence / 100).toFixed(0)} (${snap.accounts} GBP accounts)`,
    },
  });

  return {
    accounts: accounts.length,
    cashBalancePence: snap.cashBalancePence,
  };
}
