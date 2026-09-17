"use server";

import * as z from "zod";

import { parseLeahFinanceCsv } from "@/lib/finance/parse-leah-csv";
import { buildSupplierPaymentBrief } from "@/lib/finance/supplier-brief";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import {
  sendTelegramMessage,
  getKaneTelegramChatId,
} from "@/lib/telegram/client";
import { db } from "@/db";

const schema = z.object({
  csv: z.string().min(10).max(500_000),
});

export const uploadFinanceCsvAction = actionClient
  .metadata({ actionName: "admin.uploadFinanceCsv" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "leah"]);
    const parsed = parseLeahFinanceCsv(parsedInput.csv);
    if (!parsed.ok) {
      return { ok: false as const, errors: parsed.errors };
    }

    for (const row of parsed.rows) {
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

      await db.financeTxn.create({
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
          uploadBatch: parsed.batchId,
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

        if (!row.isTeamPay) {
          const kaneChatId = await getKaneTelegramChatId();
          if (kaneChatId) {
            const brief = await buildSupplierPaymentBrief(due.id);
            await sendTelegramMessage({ chatId: kaneChatId, text: brief });
          }
        }
      } else if (
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
        const kaneChatId = await getKaneTelegramChatId();
        if (kaneChatId) {
          const brief = await buildSupplierPaymentBrief(due.id);
          await sendTelegramMessage({ chatId: kaneChatId, text: brief });
        }
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
        actor: session.user.email,
        action: "finance.upload",
        meta: {
          batchId: parsed.batchId,
          rows: parsed.rows.length,
          flags: parsed.flags,
        },
      },
    });

    return {
      ok: true as const,
      rows: parsed.rows.length,
      batchId: parsed.batchId,
      flags: parsed.flags,
    };
  });
