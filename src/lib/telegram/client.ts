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

export async function getLemoniTelegramChatId() {
  return resolveSecret("TELEGRAM_LEMONI_CHAT_ID");
}

export async function isAllowedTelegramChat(chatId: string): Promise<{
  allowed: boolean;
  role: "kane" | "leah" | "lemoni" | null;
}> {
  const kaneId = await getKaneTelegramChatId();
  if (kaneId && chatId === kaneId) {
    return { allowed: true, role: "kane" };
  }
  const leahId = await getLeahTelegramChatId();
  if (leahId && chatId === leahId) {
    return { allowed: true, role: "leah" };
  }
  const lemoniId = await getLemoniTelegramChatId();
  if (lemoniId && chatId === lemoniId) {
    return { allowed: true, role: "lemoni" };
  }
  return { allowed: false, role: null };
}

/** Resolve a Telegram file_id to a downloadable file_path. */
export async function getTelegramFile(fileId: string) {
  const botToken = await resolveSecret("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return { ok: false as const, reason: "no_token" as const };
  }

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const json = (await res.json()) as {
    ok?: boolean;
    result?: { file_path?: string; file_size?: number };
  };
  if (!res.ok || !json.ok || !json.result?.file_path) {
    return { ok: false as const, reason: "get_file_failed" as const, json };
  }
  return {
    ok: true as const,
    filePath: json.result.file_path,
    fileSize: json.result.file_size,
  };
}

/** Download Telegram file contents as text (CSV ingest). Max ~20MB bot limit. */
export async function downloadTelegramFileText(fileId: string) {
  const botToken = await resolveSecret("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return { ok: false as const, reason: "no_token" as const };
  }

  const meta = await getTelegramFile(fileId);
  if (!meta.ok) return meta;

  const res = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${meta.filePath}`,
  );
  if (!res.ok) {
    return { ok: false as const, reason: "download_failed" as const };
  }
  const text = await res.text();
  return { ok: true as const, text, filePath: meta.filePath };
}
