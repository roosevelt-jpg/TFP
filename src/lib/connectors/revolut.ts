import "server-only";

import { db } from "@/db";
import { resolveSecret } from "@/lib/secrets/store";

/** Revolut Business balances — Phase 5 read-only cash feed. */
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

  await db.connectorRun.update({
    where: { sourceId: "S12" },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      status: "healthy",
    },
  });

  return { accounts: accounts.length };
}
