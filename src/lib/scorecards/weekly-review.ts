import "server-only";

import { db } from "@/db";
import { getTeamMonitorSnapshot } from "@/lib/admin/team-monitor";
import { STAFF_PEOPLE } from "@/lib/admin/staff";
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

function dubaiWeekLabel(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Stub written line from live KPIs + desk pressure — not LLM prose yet. */
function writtenReviewStub(input: {
  name: string;
  title: string;
  openTodos: number;
  overdueTodos: number;
  pendingReports: number;
  latestKpis: Array<{ kpiId: string; value: string }>;
  weekKpis: Array<{ kpiId: string; value: string }>;
}): string {
  const kpiBits =
    input.latestKpis.length > 0
      ? input.latestKpis
          .slice(0, 4)
          .map((k) => `${k.kpiId}=${k.value}`)
          .join("; ")
      : input.weekKpis.length > 0
        ? input.weekKpis
            .slice(0, 4)
            .map((k) => `${k.kpiId}=${k.value}`)
            .join("; ")
        : "no KPI rows yet";

  const pressure =
    input.overdueTodos > 0
      ? `${input.overdueTodos} overdue todo(s) — chase today.`
      : input.openTodos > 0
        ? `${input.openTodos} open todo(s), none overdue.`
        : "desk clear on open todos.";

  const reports =
    input.pendingReports > 0
      ? `${input.pendingReports} report(s) awaiting Kane read.`
      : "no pending reports.";

  return (
    `<b>${esc(input.name)}</b> (${esc(input.title)}) — ` +
    `${esc(pressure)} ${esc(reports)} Scorecard: ${esc(kpiBits)}.`
  );
}

export type WeeklyReviewResult = {
  people: number;
  text: string;
  sent: boolean;
};

/**
 * Part 03 §5 — Monday weekly person written reviews (stub).
 * One short line each for Leah / Lemoni / Indigo / Asim from kpiValue + team-monitor.
 */
export async function buildWeeklyPersonReviews(
  now = new Date(),
): Promise<WeeklyReviewResult> {
  const today = startOfUtcDay(now);
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [team, weekKpis] = await Promise.all([
    getTeamMonitorSnapshot(),
    db.kpiValue.findMany({
      where: { date: { gte: weekAgo, lte: today } },
      orderBy: [{ date: "desc" }, { kpiId: "asc" }],
    }),
  ]);

  const lines: string[] = [
    `<b>WEEKLY PERSON REVIEWS</b> | ${esc(dubaiWeekLabel(now))} Dubai`,
    "Stub written reviews from live scorecards — expand with CTO prose later.",
    "",
  ];

  for (const person of STAFF_PEOPLE) {
    const snap = team.find((t) => t.personKey === person.personKey);
    const personWeek = weekKpis.filter((k) => k.personKey === person.personKey);
    // Prefer latest distinct kpiIds from the week
    const seen = new Set<string>();
    const weekLatest: Array<{ kpiId: string; value: string }> = [];
    for (const row of personWeek) {
      if (seen.has(row.kpiId)) continue;
      seen.add(row.kpiId);
      weekLatest.push({ kpiId: row.kpiId, value: row.value });
    }

    lines.push(
      writtenReviewStub({
        name: person.name,
        title: person.title,
        openTodos: snap?.openTodos ?? 0,
        overdueTodos: snap?.overdueTodos ?? 0,
        pendingReports: snap?.pendingReports ?? 0,
        latestKpis: snap?.latestKpis ?? [],
        weekKpis: weekLatest,
      }),
    );
    lines.push("");
  }

  lines.push("Full desks → /admin/team");

  return {
    people: STAFF_PEOPLE.length,
    text: lines.join("\n").trim(),
    sent: false,
  };
}

/** Monday cron: Telegram Kane the weekly person review stub. */
export async function sendWeeklyPersonReviews(
  now = new Date(),
): Promise<WeeklyReviewResult> {
  const review = await buildWeeklyPersonReviews(now);

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: review.text,
    });
  }

  await db.auditLog.create({
    data: {
      actor: "scorecards.weekly-review",
      action: "scorecards.weekly_person_reviews",
      meta: { people: review.people, sent: Boolean(kaneChatId) },
    },
  });

  return { ...review, sent: Boolean(kaneChatId) };
}
