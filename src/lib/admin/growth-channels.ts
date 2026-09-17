import "server-only";

import { db } from "@/db";
import type { LeadChannel } from "@/generated/prisma/client";

export type GrowthChannel = "whatsapp" | "instagram" | "telegram" | "email";

export type GrowthThread = {
  id: string;
  channel: string;
  contactName: string;
  snippet: string;
  externalId: string;
  highIntent: boolean;
  lastInboundAt: string | null;
  lastReplyAt: string | null;
  needsHuman: boolean;
  handling: "ai" | "human" | "queued";
};

function needsHumanFromSnippet(snippet: string | null, highIntent: boolean) {
  if (!snippet) return highIntent;
  return (
    highIntent ||
    /refund|chargeback|complaint|lawyer|scam|human|speak to|call me|urgent/i.test(
      snippet,
    )
  );
}

export async function getGrowthChannelThreads(
  channel: GrowthChannel,
): Promise<{ threads: GrowthThread[]; aiHandledHint: string }> {
  if (channel === "telegram") {
    const logs = await db.telegramMessageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    const byChat = new Map<string, (typeof logs)[0]>();
    for (const row of logs) {
      if (!byChat.has(row.chatId)) byChat.set(row.chatId, row);
    }
    const threads: GrowthThread[] = [...byChat.entries()].map(([chatId, row]) => {
      const payload = row.payload as { text?: string } | null;
      const snippet =
        typeof payload?.text === "string"
          ? payload.text.slice(0, 220)
          : row.kind;
      const human = needsHumanFromSnippet(snippet, false);
      return {
        id: row.id,
        channel: "telegram",
        contactName: `Chat ${chatId}`,
        snippet,
        externalId: chatId,
        highIntent: human,
        lastInboundAt:
          row.direction === "in" ? row.createdAt.toISOString() : null,
        lastReplyAt:
          row.direction === "out" ? row.createdAt.toISOString() : null,
        needsHuman: human,
        handling: human ? "human" : "ai",
      };
    });
    return {
      threads,
      aiHandledHint:
        "CTO / Telegram bot answers ops chatter; Kane & Leah chats stay human-gated.",
    };
  }

  const leadChannel: LeadChannel =
    channel === "whatsapp"
      ? "whatsapp"
      : channel === "instagram"
        ? "instagram"
        : "email";

  const rows = await db.leadThread.findMany({
    where: { channel: leadChannel },
    orderBy: [{ highIntent: "desc" }, { lastInboundAt: "desc" }],
    take: 50,
  });

  const threads: GrowthThread[] = rows.map((thread) => {
    const human = needsHumanFromSnippet(thread.snippet, thread.highIntent);
    const unanswered =
      thread.lastInboundAt &&
      (!thread.lastReplyAt ||
        thread.lastReplyAt.getTime() < thread.lastInboundAt.getTime());
    return {
      id: thread.id,
      channel: thread.channel,
      contactName: thread.contactName ?? "Unknown",
      snippet: thread.snippet ?? "Inbound message",
      externalId: thread.externalId,
      highIntent: thread.highIntent,
      lastInboundAt: thread.lastInboundAt?.toISOString() ?? null,
      lastReplyAt: thread.lastReplyAt?.toISOString() ?? null,
      needsHuman: human || Boolean(unanswered && thread.highIntent),
      handling: human ? "human" : unanswered ? "queued" : "ai",
    };
  });

  const hints: Record<GrowthChannel, string> = {
    whatsapp:
      "AI owns routine WhatsApp; Leah / Kane take refunds, complaints and coaching clients.",
    instagram:
      "AI triages DMs; Lemoni / Kane jump in on high-intent sales and brand risk.",
    email:
      "AI drafts replies; Leah owns CS, Lemoni owns affiliate threads when tagged.",
    telegram:
      "Ops channel — human-gated for Kane approvals; bot handles status pings.",
  };

  return { threads, aiHandledHint: hints[channel] };
}
