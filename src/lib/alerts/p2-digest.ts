import "server-only";

import { db } from "@/db";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dubaiLabel(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function ageLabel(firedAt: Date) {
  const mins = Math.max(0, Math.floor((Date.now() - firedAt.getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export type P2DigestResult = {
  count: number;
  sent: boolean;
  text: string;
};

/** Collect open (and acknowledged) P2 alerts into a Telegram digest. */
export async function buildP2Digest(): Promise<P2DigestResult> {
  const open = await db.alert.findMany({
    where: {
      severity: "p2",
      status: { in: ["open", "acknowledged"] },
    },
    orderBy: [{ firedAt: "asc" }],
    take: 40,
    select: {
      ruleId: true,
      title: true,
      status: true,
      firedAt: true,
    },
  });

  const lines: string[] = [
    `<b>P2 DIGEST</b> · ${esc(dubaiLabel())} Dubai`,
    `${open.length} open / acknowledged`,
    "",
  ];

  if (open.length === 0) {
    lines.push("— none");
  } else {
    for (const a of open) {
      lines.push(
        `• <b>${esc(a.ruleId)}</b> [${esc(a.status)}] ${esc(ageLabel(a.firedAt))} — ${esc(a.title)}`,
      );
    }
  }

  return {
    count: open.length,
    sent: false,
    text: lines.join("\n"),
  };
}

/** Build and send the P2 digest to Kane (skips Telegram when empty optional). */
export async function sendP2Digest(opts?: {
  skipIfEmpty?: boolean;
}): Promise<P2DigestResult> {
  const digest = await buildP2Digest();
  if (opts?.skipIfEmpty && digest.count === 0) {
    return digest;
  }

  const kaneChatId = await getKaneTelegramChatId();
  if (!kaneChatId) {
    return digest;
  }

  await sendTelegramMessage({
    chatId: kaneChatId,
    text: digest.text,
  });

  return { ...digest, sent: true };
}
