import "server-only";

import { db } from "@/db";
import { formatMoney } from "@/lib/admin/format";

/**
 * Kane-ready supplier payment brief (Part 04 §5).
 * Sent on Telegram when a non-team PaymentDue is created.
 */
export async function buildSupplierPaymentBrief(paymentDueId: string) {
  const due = await db.paymentDue.findUniqueOrThrow({
    where: { id: paymentDueId },
  });

  const snap = await db.dailySnapshot.findFirst({
    orderBy: { date: "desc" },
  });

  const cash = await db.cashBalance.findMany({
    where: { currency: due.currency.toLowerCase() },
  });
  const cashTotal = cash.reduce((s, c) => s + c.balanceMinor, 0);
  const afterPayment = cashTotal - due.amountPence;

  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 14);
  const otherDues = await db.paymentDue.findMany({
    where: {
      id: { not: due.id },
      status: { in: ["due", "awaiting_kane"] },
      dueDate: { lte: horizon },
    },
  });
  const otherDuesTotal = otherDues.reduce((s, d) => s + d.amountPence, 0);

  const projected14 =
    afterPayment -
    otherDuesTotal +
    (snap?.revenuePence ? Math.round(snap.revenuePence * 0.3) : 0);

  const money = (pence: number) =>
    formatMoney(pence, due.currency.toUpperCase());

  let recommendation = "PAY ON DUE DATE";
  if (afterPayment < 0) {
    recommendation = "HOLD — cash would go negative";
  } else if (projected14 < due.amountPence) {
    recommendation = "HOLD — projected 14d cash thin";
  } else if (
    due.dueDate.getTime() - Date.now() <
    2 * 86_400_000
  ) {
    recommendation = "PAY NOW — due within 48h and cash covers it";
  }

  const dueDate = due.dueDate.toISOString().slice(0, 10);

  return [
    `<b>SUPPLIER PAYMENT:</b> ${due.payee} | ${money(due.amountPence)} | due ${dueDate}`,
    `What for:           ${due.category}${due.approvedBy ? ` (approved_by ${due.approvedBy})` : ""}`,
    `Cash position:      today ${money(cashTotal)} → after this payment ${money(afterPayment)} → projected 14 days ${money(projected14)}`,
    `Other dues in 14d:  ${money(otherDuesTotal)} across ${otherDues.length} payments`,
    `P&L position:       MTD contribution ${money(snap?.contributionPence ?? 0)} (latest snapshot)`,
    `Stock context:      not linked — confirm SKU cover if this is a COGS buy`,
    `Risk if delayed:    late fee / supplier terms / stock-out (confirm with Leah)`,
    `Recommendation:     ${recommendation}`,
    "",
    "No agent moves money — Kane decides. Leah pays after approval.",
  ].join("\n");
}

/** Notify Kane when a PaymentDue is created or marked due (idempotent caller). */
export async function notifyKaneOfPaymentDue(paymentDueId: string) {
  const due = await db.paymentDue.findUnique({ where: { id: paymentDueId } });
  if (!due || due.isTeamPay) return { sent: false as const, reason: "team_or_missing" };

  const { getKaneTelegramChatId, sendTelegramMessage } = await import(
    "@/lib/telegram/client"
  );
  const kaneChatId = await getKaneTelegramChatId();
  if (!kaneChatId) return { sent: false as const, reason: "no_kane_chat" };

  const brief = await buildSupplierPaymentBrief(paymentDueId);
  await sendTelegramMessage({ chatId: kaneChatId, text: brief });
  return { sent: true as const };
}
