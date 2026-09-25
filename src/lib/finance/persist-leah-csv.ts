import "server-only";

import {
  parseLeahFinanceCsv,
  type FinanceParseResult,
  type FinanceRow,
} from "@/lib/finance/parse-leah-csv";
import { notifyKaneOfPaymentDue } from "@/lib/finance/supplier-brief";
import { reconcilePayoutTxn } from "@/lib/finance/payout-reconcile";
import { db } from "@/db";

export type PersistLeahFinanceResult =
  | {
      ok: true;
      rows: number;
      batchId: string;
      flags: string[];
      duesCreated: number;
      payoutsReconciled: number;
    }
  | { ok: false; errors: Array<{ row: number; reason: string }> };

async function persistRow(
  row: FinanceRow,
  batchId: string,
): Promise<{ dueId?: string; txnId: string }> {
  if (row.rowType === "BALANCE" && row.account) {
    await db.cashBalance.upsert({
      where: { account: row.account },
      create: {
        account: row.account,
        currency: row.currency,
        balanceMinor: row.amountPence,
        label: "recorded",
        recordedAt: new Date(row.date),
      },
      update: {
        currency: row.currency,
        balanceMinor: row.amountPence,
        recordedAt: new Date(row.date),
        label: "recorded",
      },
    });
  }

  const txn = await db.financeTxn.create({
    data: {
      date: new Date(row.date),
      category: row.category,
      subcategory: row.rowType !== "LEGACY" ? row.rowType : row.subcategory,
      description: row.description,
      amountPence:
        row.rowType === "OUT" || row.rowType === "DUE"
          ? -Math.abs(row.amountPence)
          : row.amountPence,
      currency: row.currency,
      account: row.account,
      businessLine: row.businessLine,
      rowNumber: row.rowNumber,
      uploadBatch: batchId,
      label: "recorded",
    },
  });

  if (row.rowType === "DUE") {
    const due = await db.paymentDue.create({
      data: {
        payee: row.counterparty || row.description,
        amountPence: Math.abs(row.amountPence),
        currency: row.currency,
        dueDate: new Date(row.dueDate || row.date),
        category: row.category,
        status: "awaiting_kane",
        isTeamPay: row.isTeamPay,
        approvedBy: row.approvedBy,
        label: "recorded",
      },
    });
    await notifyKaneOfPaymentDue(due.id);
    return { dueId: due.id, txnId: txn.id };
  }

  if (
    row.rowType === "LEGACY" &&
    row.category !== "TEAM" &&
    row.category !== "PAYROLL" &&
    row.amountPence < 0
  ) {
    const due = await db.paymentDue.create({
      data: {
        payee: row.description,
        amountPence: Math.abs(row.amountPence),
        currency: row.currency,
        dueDate: new Date(row.date),
        category: row.category,
        status: "awaiting_kane",
        isTeamPay: false,
        label: "recorded",
      },
    });
    await notifyKaneOfPaymentDue(due.id);
    return { dueId: due.id, txnId: txn.id };
  }

  return { txnId: txn.id };
}

/**
 * Parse + persist Leah finance CSV (admin upload and Telegram ingest).
 * DUE rows notify Kane with a supplier brief (non-team). Payout IN rows
 * attempt Stripe/Shopify reconciliation.
 */
export async function persistLeahFinanceCsv(input: {
  csv: string;
  actor: string;
}): Promise<PersistLeahFinanceResult> {
  const parsed: FinanceParseResult = parseLeahFinanceCsv(input.csv);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }

  let duesCreated = 0;
  let payoutsReconciled = 0;

  for (const row of parsed.rows) {
    const { txnId, dueId } = await persistRow(row, parsed.batchId);
    if (dueId) duesCreated += 1;

    if (
      (row.rowType === "IN" || row.rowType === "LEGACY") &&
      (row.category === "PAYOUT_STRIPE" ||
        row.category === "PAYOUT_SHOPIFY" ||
        row.category === "PAYOUT_TIKTOK") &&
      row.amountPence > 0
    ) {
      const result = await reconcilePayoutTxn(txnId);
      if (result.matched) payoutsReconciled += 1;
    }
  }

  for (const flag of parsed.flags) {
    if (flag === "legacy_template") continue;
    await db.alert.create({
      data: {
        ruleId: "CA1",
        severity: "p3",
        title: flag,
        payload: { batchId: parsed.batchId },
        threadKey: `CA1-${parsed.batchId}-${flag.slice(0, 40)}`,
      },
    });
  }

  await db.auditLog.create({
    data: {
      actor: input.actor,
      action: "finance.upload",
      meta: {
        batchId: parsed.batchId,
        rows: parsed.rows.length,
        flags: parsed.flags,
        duesCreated,
        payoutsReconciled,
      },
    },
  });

  return {
    ok: true,
    rows: parsed.rows.length,
    batchId: parsed.batchId,
    flags: parsed.flags,
    duesCreated,
    payoutsReconciled,
  };
}
