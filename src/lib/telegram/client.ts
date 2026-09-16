import "server-only";

import { env } from "@/env";
import { db } from "@/db";

export async function sendTelegramMessage(input: {
  chatId: string;
  text: string;
  replyMarkup?: unknown;
}) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    await db.telegramMessageLog.create({
      data: {
        chatId: input.chatId,
        direction: "out",
        kind: "skipped_no_token",
        payload: { text: input.text },
      },
    });
    return { ok: false as const, reason: "no_token" };
  }

  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        parse_mode: "HTML",
        reply_markup: input.replyMarkup,
      }),
    },
  );

  const json = (await res.json()) as unknown;
  await db.telegramMessageLog.create({
    data: {
      chatId: input.chatId,
      direction: "out",
      kind: res.ok ? "sent" : "error",
      payload: { text: input.text, response: json as object },
    },
  });

  return { ok: res.ok as boolean, json };
}

export function isAllowedTelegramChat(chatId: string): {
  allowed: boolean;
  role: "kane" | "leah" | null;
} {
  if (env.TELEGRAM_KANE_CHAT_ID && chatId === env.TELEGRAM_KANE_CHAT_ID) {
    return { allowed: true, role: "kane" };
  }
  if (env.TELEGRAM_LEAH_CHAT_ID && chatId === env.TELEGRAM_LEAH_CHAT_ID) {
    return { allowed: true, role: "leah" };
  }
  return { allowed: false, role: null };
}
