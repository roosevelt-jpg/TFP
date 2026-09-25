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

function numVal(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Rule-based weekly person prose from live KPIs + desk pressure (Part 03 §5).
 * Not LLM — honest, UK English, scorecard-driven.
 */
function writtenReview(input: {
  name: string;
  title: string;
  personKey: string;
  openTodos: number;
  overdueTodos: number;
  pendingReports: number;
  latestKpis: Array<{ kpiId: string; value: string }>;
  weekKpis: Array<{ kpiId: string; value: string }>;
}): string {
  const kpis =
    input.latestKpis.length > 0 ? input.latestKpis : input.weekKpis;

  const byId = (re: RegExp) =>
    kpis.find((k) => re.test(k.kpiId))?.value;

  let verdict: string;
  let focus: string;

  if (input.personKey === "leah") {
    const unanswered = numVal(byId(/unanswered|high-intent/i));
    const upload = numVal(byId(/finance upload|upload today/i));
    const pastDue = numVal(byId(/past-due|subscription/i));
    if (unanswered != null && unanswered > 5) {
      verdict = `CS pressure: ${unanswered} high-intent threads unanswered — clear the backlog before new finance work.`;
    } else if (pastDue != null && pastDue > 0) {
      verdict = `${pastDue} past-due subscription(s) on the books — chase with Stripe/Shopify before they age further.`;
    } else if (upload === 0) {
      verdict =
        "Finance template not marked uploaded today — confirm Leah's daily CSV landed.";
    } else {
      verdict =
        "Desk steady: finance feed on track and high-intent backlog contained.";
    }
    focus =
      unanswered != null && unanswered > 0
        ? `Focus: close ${unanswered} unanswered DM(s).`
        : "Focus: keep template on time and refunds under the £50 cap.";
  } else if (input.personKey === "lemoni") {
    const calls = numVal(byId(/^Calls today$/i));
    const reports = input.pendingReports;
    const planOnTime = numVal(byId(/SMM plan-on-time/i));
    const fill = numVal(byId(/SMM calendar fill/i));
    const compliance = numVal(byId(/SMM compliance first-pass/i));
    if (reports > 0) {
      verdict = `${reports} staff report(s) awaiting Kane read — pre-read before Sunday planning.`;
    } else if (planOnTime === 0 && planOnTime != null) {
      verdict =
        "Weekly Posting Plan missed Monday 18:00 — protect Monday content block next week.";
    } else if (fill != null && fill < 70) {
      verdict = `Calendar fill ${fill}% — CT6 gaps likely; push social manager for slot coverage.`;
    } else if (compliance != null && compliance < 80) {
      verdict = `First-pass compliance ${compliance}% — editor/KB brief quality needs a nudge.`;
    } else if (calls != null && calls === 0) {
      verdict = "No calls logged today — confirm setter calendar and DM→book ladder.";
    } else {
      verdict =
        "PA + affiliate desk in shape; content KPIs and call load look manageable.";
    }
    focus =
      fill != null && fill < 85
        ? `Focus: lift calendar fill (now ${fill}%) and land the weekly report Saturday.`
        : "Focus: affiliate register integrity and Sunday planning pack.";
  } else if (input.personKey === "indigo") {
    const errors = numVal(byId(/connector|SY5|workflow|failure/i));
    if (errors != null && errors > 0) {
      verdict = `${errors} connector/workflow issue(s) in window — treat as SY5 until green.`;
      focus = "Focus: restore healthy connector runs; escalation router check.";
    } else {
      verdict =
        "Automation layer quiet — no open connector errors in the scorecard window.";
      focus = "Focus: keep n8n/GHL heartbeats green; no silent workflow pauses.";
    }
  } else if (input.personKey === "asim") {
    const shipped = numVal(byId(/shipped|Fulfilment/i));
    const lowStock = numVal(byId(/Stock under|cover/i));
    if (lowStock != null && lowStock > 0) {
      verdict = `${lowStock} SKU(s) under 30-day cover — flag Leah/Kane before stock-outs.`;
    } else if (shipped != null && shipped === 0) {
      verdict =
        "No fulfilments shipped in the last 24h — confirm UK pick & pack volume.";
    } else {
      verdict = `Dispatch moving (${shipped ?? "n/a"} shipped 24h); stock cover not flashing red.`;
    }
    focus =
      lowStock != null && lowStock > 0
        ? "Focus: component gaps + lowest-cover SKUs."
        : "Focus: hold 24h UK dispatch rate.";
  } else {
    verdict = "Scorecard row present; no person-specific rule matched.";
    focus = "Focus: clear overdue todos.";
  }

  const pressure =
    input.overdueTodos > 0
      ? `${input.overdueTodos} overdue todo(s) — chase today.`
      : input.openTodos > 0
        ? `${input.openTodos} open todo(s), none overdue.`
        : "Desk clear on open todos.";

  const kpiBits =
    kpis.length > 0
      ? kpis
          .slice(0, 4)
          .map((k) => `${k.kpiId}=${k.value}`)
          .join("; ")
      : "no KPI rows yet";

  return (
    `<b>${esc(input.name)}</b> (${esc(input.title)}) — ${esc(verdict)} ` +
    `${esc(focus)} Desk: ${esc(pressure)} Scorecard: ${esc(kpiBits)}.`
  );
}

export type WeeklyReviewResult = {
  people: number;
  text: string;
  sent: boolean;
};

/**
 * Part 03 §5 — Monday weekly person written reviews (rule-based from KPIs).
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
    "Rule-based reviews from live scorecards (Leah / Lemoni / Indigo / Asim).",
    "",
  ];

  for (const person of STAFF_PEOPLE) {
    const snap = team.find((t) => t.personKey === person.personKey);
    const personWeek = weekKpis.filter((k) => k.personKey === person.personKey);
    const seen = new Set<string>();
    const weekLatest: Array<{ kpiId: string; value: string }> = [];
    for (const row of personWeek) {
      if (seen.has(row.kpiId)) continue;
      seen.add(row.kpiId);
      weekLatest.push({ kpiId: row.kpiId, value: row.value });
    }

    lines.push(
      writtenReview({
        name: person.name,
        title: person.title,
        personKey: person.personKey,
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

/** Monday cron: Telegram Kane the weekly person reviews. */
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
