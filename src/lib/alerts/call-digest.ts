import "server-only";

import { db } from "@/db";
import {
  getKaneTelegramChatId,
  getLemoniTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Dubai calendar day bounds as UTC instants (Gulf Standard Time, UTC+4, no DST). */
export function dubaiDayBounds(offsetDays = 0, now = new Date()) {
  const dubaiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
  }).format(now);
  const [y, m, d] = dubaiDate.split("-").map(Number);
  const startMs =
    Date.UTC(y!, m! - 1, d! + offsetDays, 0, 0, 0) - 4 * 3600_000;
  const start = new Date(startMs);
  const end = new Date(startMs + 24 * 3600_000);
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);
  return { start, end, label };
}

function oneLineBrief(input: {
  inviteeName: string | null;
  inviteeEmail: string | null;
  eventType: string | null;
  setter: string | null;
  outcome: string;
  bioSummary: string | null;
  enrolments: Array<{ line: string; tier: string | null; status: string }>;
}): string {
  const who = input.inviteeName ?? input.inviteeEmail ?? "Invitee";
  const type = input.eventType ?? "call";
  const setter = input.setter ? ` · setter ${input.setter}` : "";
  const enrolment =
    input.enrolments[0] != null
      ? ` · ${input.enrolments[0].line}${input.enrolments[0].tier ? ` ${input.enrolments[0].tier}` : ""} (${input.enrolments[0].status})`
      : "";
  const bio =
    input.bioSummary && input.bioSummary.trim()
      ? ` — ${input.bioSummary.trim().slice(0, 80)}`
      : "";
  return `${who} · ${type}${setter}${enrolment} · ${input.outcome}${bio}`;
}

export type CallDigestResult = {
  count: number;
  text: string;
  sentTo: string[];
};

/** CL4 — tomorrow's call list with one-line briefs (Part 03 §2.9). */
export async function buildTomorrowCallDigest(
  now = new Date(),
): Promise<CallDigestResult> {
  const { start, end, label } = dubaiDayBounds(1, now);

  const calls = await db.call.findMany({
    where: {
      scheduledAt: { gte: start, lt: end },
      outcome: { notIn: ["cancelled"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: 40,
    include: {
      person: {
        select: {
          bioSummary: true,
          enrolments: {
            where: { status: { in: ["active", "pending_onboarding"] } },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { line: true, tier: true, status: true },
          },
        },
      },
    },
  });

  const lines: string[] = [
    `<b>CL4 · TOMORROW'S CALLS</b> | ${esc(label)} Dubai`,
    `${calls.length} booked`,
    "",
  ];

  if (calls.length === 0) {
    lines.push("— none booked");
  } else {
    for (const call of calls) {
      const t = call.scheduledAt.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Dubai",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const brief = oneLineBrief({
        inviteeName: call.inviteeName,
        inviteeEmail: call.inviteeEmail,
        eventType: call.eventType,
        setter: call.setter,
        outcome: call.outcome,
        bioSummary: call.person?.bioSummary ?? null,
        enrolments: call.person?.enrolments ?? [],
      });
      lines.push(`• ${esc(t)} — ${esc(brief)}`);
    }
  }

  lines.push("", "Kane + Lemoni · /admin");

  return {
    count: calls.length,
    text: lines.join("\n"),
    sentTo: [],
  };
}

/** Send CL4 to Kane and Lemoni Telegram chats. */
export async function sendTomorrowCallDigest(
  now = new Date(),
): Promise<CallDigestResult> {
  const digest = await buildTomorrowCallDigest(now);
  const recipients = [
    await getKaneTelegramChatId(),
    await getLemoniTelegramChatId(),
  ].filter((id): id is string => Boolean(id));

  const unique = [...new Set(recipients)];
  for (const chatId of unique) {
    await sendTelegramMessage({ chatId, text: digest.text });
  }

  await db.auditLog.create({
    data: {
      actor: "alerts.call-digest",
      action: "alerts.cl4_tomorrow_calls",
      meta: { count: digest.count, sentTo: unique.length },
    },
  });

  return { ...digest, sentTo: unique };
}
