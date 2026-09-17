import "server-only";

import { db } from "@/db";
import { STAFF_PEOPLE, type PersonKey } from "@/lib/admin/staff";
import { startOfUtcDay, requestNow } from "@/lib/admin/request-time";

export type TeamMonitorSnapshot = {
  personKey: PersonKey;
  name: string;
  openTodos: number;
  overdueTodos: number;
  pendingReports: number;
  latestKpis: Array<{ kpiId: string; value: string }>;
  lastReportAt: string | null;
};

/** Shared team desk snapshot for Kane briefings + CTO context. */
export async function getTeamMonitorSnapshot(): Promise<TeamMonitorSnapshot[]> {
  const now = await requestNow();
  const today = startOfUtcDay(now);
  const weekAgo = new Date(today);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [kpis, todos, reports] = await Promise.all([
    db.kpiValue.findMany({
      where: { date: today },
      orderBy: { kpiId: "asc" },
    }),
    db.staffTodo.findMany({
      where: { status: "open" },
    }),
    db.staffReport.findMany({
      where: {
        OR: [
          { status: "submitted" },
          { submittedAt: { gte: weekAgo } },
        ],
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return STAFF_PEOPLE.map((person) => {
    const personTodos = todos.filter((t) => t.personKey === person.personKey);
    const personReports = reports.filter(
      (r) => r.personKey === person.personKey,
    );
    const last = personReports.find((r) => r.submittedAt);
    return {
      personKey: person.personKey,
      name: person.name,
      openTodos: personTodos.length,
      overdueTodos: personTodos.filter(
        (t) => t.dueAt && t.dueAt.getTime() < now.getTime(),
      ).length,
      pendingReports: personReports.filter((r) => r.status === "submitted")
        .length,
      latestKpis: kpis
        .filter((k) => k.personKey === person.personKey)
        .map((k) => ({ kpiId: k.kpiId, value: k.value })),
      lastReportAt: last?.submittedAt?.toISOString() ?? null,
    };
  });
}

/** Ensure recurring system todos exist (idempotent daily). */
export async function ensureAccountabilityTodos() {
  const now = await requestNow();
  const dubaiParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = dubaiParts.find((p) => p.type === "weekday")?.value;
  const hour = Number(dubaiParts.find((p) => p.type === "hour")?.value ?? 0);

  const dueEndOfDay = new Date(now.getTime() + 12 * 3600_000);

  async function ensureTodo(personKey: PersonKey, title: string) {
    const existing = await db.staffTodo.findFirst({
      where: { personKey, title, status: "open" },
    });
    if (existing) return;
    const user = await db.user.findFirst({ where: { role: personKey } });
    await db.staffTodo.create({
      data: {
        personKey,
        userId: user?.id,
        title,
        dueAt: dueEndOfDay,
        source: "system",
        createdBy: "accountability-cron",
      },
    });
  }

  await ensureTodo(
    "leah",
    "Upload today’s finance template before 13:00 Dubai",
  );

  if (weekday === "Sat" && hour >= 18) {
    await ensureTodo(
      "lemoni",
      "Submit weekly report (due Saturday 20:00 Dubai)",
    );
  }

  if (weekday === "Fri") {
    await ensureTodo("indigo", "Submit weekly systems position report");
    await ensureTodo("asim", "Submit weekly fulfilment position report");
  }

  return { ok: true as const };
}
