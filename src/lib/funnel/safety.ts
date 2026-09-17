import "server-only";

import { db } from "@/db";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

const SAFETY_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "injury", re: /\b(chest pain|can't breathe|cannot breathe|suicid|self.?harm|overdose)\b/i },
  { id: "ed", re: /\b(anorexi|bulimi|purge|binge.?eat|eating disorder)\b/i },
  { id: "medical_emergency", re: /\b(emergency|ambulance|ER|A&E|hospitali[sz]ed)\b/i },
  { id: "hormone_claim", re: /\b(boosts? testosterone|TRT|hormone replacement|steroids?)\b/i },
];

export type SafetyScanResult = {
  flagged: boolean;
  matches: string[];
  paused: boolean;
};

/**
 * Spec §13.2 — pause automated replies and escalate to Kane when safety language appears.
 */
export async function scanAndEscalateSafety(input: {
  text: string;
  source: string;
  threadId?: string | null;
  customerId?: string | null;
  contactLabel?: string | null;
}): Promise<SafetyScanResult> {
  const matches = SAFETY_PATTERNS.filter((p) => p.re.test(input.text)).map(
    (p) => p.id,
  );
  if (matches.length === 0) {
    return { flagged: false, matches: [], paused: false };
  }

  const threadKey = `SAFE-${input.threadId ?? input.customerId ?? "anon"}-${matches.join(",")}`;
  const existing = await db.alert.findFirst({
    where: { threadKey, status: { in: ["open", "acknowledged"] } },
  });

  if (!existing) {
    await db.alert.create({
      data: {
        ruleId: "SAFE1",
        severity: "p1",
        title: `Safety language detected (${matches.join(", ")}) — ${input.contactLabel ?? input.source}`,
        payload: {
          matches,
          source: input.source,
          threadId: input.threadId,
          customerId: input.customerId,
          excerpt: input.text.slice(0, 240),
        },
        threadKey,
      },
    });

    await db.staffTodo.create({
      data: {
        personKey: "kane",
        title: `Safety review: ${matches.join(", ")} · ${input.contactLabel ?? input.source}`,
        status: "open",
        dueAt: new Date(),
        source: "system",
        createdBy: "safety",
      },
    });

    const kaneChatId = await getKaneTelegramChatId();
    if (kaneChatId) {
      await sendTelegramMessage({
        chatId: kaneChatId,
        text: `P1 SAFE1 · Safety language (${matches.join(", ")}) — AI/auto replies paused. Review /admin/alerts`,
      });
    }
  }

  if (input.threadId) {
    await db.leadThread.updateMany({
      where: { id: input.threadId },
      data: { highIntent: true },
    });
  }

  return { flagged: true, matches, paused: true };
}
