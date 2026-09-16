"use server";

import * as z from "zod";

import { parseLeahFinanceCsv } from "@/lib/finance/parse-leah-csv";
import { buildSupplierPaymentBrief } from "@/lib/finance/supplier-brief";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { env } from "@/env";
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
      await db.financeTxn.create({
        data: {
          date: new Date(row.date),
          category: row.category,
          subcategory: row.subcategory,
          description: row.description,
          amountPence: row.amountPence,
          currency: row.currency,
          account: row.account,
          businessLine: row.businessLine,
          rowNumber: row.rowNumber,
          uploadBatch: parsed.batchId,
          label: "recorded",
        },
      });

      if (row.category === "COGS" || row.amountPence < 0) {
        // Outgoing / due style rows surface on Money.
      }

      if (
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

        if (env.TELEGRAM_KANE_CHAT_ID) {
          const brief = await buildSupplierPaymentBrief(due.id);
          await sendTelegramMessage({
            chatId: env.TELEGRAM_KANE_CHAT_ID,
            text: brief,
          });
        }
      }
    }

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "finance.upload",
        meta: { batchId: parsed.batchId, rows: parsed.rows.length },
      },
    });

    return { ok: true as const, batchId: parsed.batchId, rows: parsed.rows.length };
  });
