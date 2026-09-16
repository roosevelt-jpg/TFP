import "server-only";

import { db } from "@/db";
import { formatGbp } from "@/lib/admin/format";

export async function buildSupplierPaymentBrief(paymentDueId: string) {
  const due = await db.paymentDue.findUniqueOrThrow({
    where: { id: paymentDueId },
  });
  const snap = await db.dailySnapshot.findFirst({
    orderBy: { date: "desc" },
  });
  const cash = await db.cashBalance.findMany({
    where: { currency: "gbp" },
  });
  const cashTotal = cash.reduce((s, c) => s + c.balanceMinor, 0);

  return [
    "<b>Supplier payment brief</b>",
    `Payee: ${due.payee}`,
    `Amount: ${formatGbp(due.amountPence)} ${due.currency.toUpperCase()}`,
    `Due: ${due.dueDate.toISOString().slice(0, 10)}`,
    `Category: ${due.category}`,
    "",
    `Cash (GBP recorded): ${formatGbp(cashTotal)}`,
    `Yesterday contribution: ${formatGbp(snap?.contributionPence ?? 0)}`,
    "",
    "Recommendation: pay only if cash after payment stays above 30 days burn.",
    "No agent moves money — Kane decides.",
  ].join("\n");
}
