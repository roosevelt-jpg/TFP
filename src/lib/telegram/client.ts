import "server-only";

import { db } from "@/db";
import { resolveSecret } from "@/lib/secrets/store";

export async function sendTelegramMessage(input: {
  chatId: string;
  text: string;
  replyMarkup?: unknown;
}) {
  const botToken = await resolveSecret("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
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
    `https://api.telegram.org/bot${botToken}/sendMessage`,
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

export async function getKaneTelegramChatId() {
  return resolveSecret("TELEGRAM_KANE_CHAT_ID");
}

export async function getLeahTelegramChatId() {
  return resolveSecret("TELEGRAM_LEAH_CHAT_ID");
}

export async function isAllowedTelegramChat(chatId: string): Promise<{
  allowed: boolean;
  role: "kane" | "leah" | null;
}> {
  const kaneId = await getKaneTelegramChatId();
  if (kaneId && chatId === kaneId) {
    return { allowed: true, role: "kane" };
  }
  const leahId = await getLeahTelegramChatId();
  if (leahId && chatId === leahId) {
    return { allowed: true, role: "leah" };
  }
  return { allowed: false, role: null };
}
