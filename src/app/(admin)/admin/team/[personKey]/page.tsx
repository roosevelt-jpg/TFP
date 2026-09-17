import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { db } from "@/db";
import { staffPerson } from "@/lib/admin/staff";
import { requireAdminSession } from "@/lib/auth/session";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ personKey: string }>;
};

export default async function TeamPersonPage({ params }: Props) {
  await requireAdminSession(["kane"]);
  const { personKey } = await params;
  const person = staffPerson(personKey);
  if (!person) notFound();

  const [kpis, todos, reports] = await Promise.all([
    db.kpiValue.findMany({
      where: { personKey },
      orderBy: [{ date: "desc" }, { kpiId: "asc" }],
      take: 40,
    }),
    db.staffTodo.findMany({
      where: { personKey },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 30,
    }),
    db.staffReport.findMany({
      where: { personKey },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <AdminShell titleKey={`${person.name} scorecard`}>
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          <Link href="/admin/team">← Team</Link> · {person.title}
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">KPI history</div>
          </div>
          <div className="cmd-panel-body">
            {kpis.length === 0 ? (
              <div className="cmd-list-sub">not measurable yet</div>
            ) : (
              kpis.map((kpi) => (
                <div className="cmd-list-row" key={kpi.id}>
                  <div>
                    <div className="cmd-list-title">
                      {kpi.kpiId}: {kpi.value}
                    </div>
                    <div className="cmd-list-sub">
                      {kpi.date.toISOString().slice(0, 10)} · {kpi.label}
                      {kpi.source ? ` · ${kpi.source}` : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Todos</div>
          </div>
          <div className="cmd-panel-body">
            {todos.map((todo) => (
              <div className="cmd-list-row" key={todo.id}>
                <div>
                  <div className="cmd-list-title">{todo.title}</div>
                  <div className="cmd-list-sub">
                    {todo.status}
                    {todo.dueAt
                      ? ` · due ${todo.dueAt.toLocaleString("en-GB")}`
                      : ""}
                  </div>
                </div>
              </div>
            ))}
            {todos.length === 0 ? (
              <div className="cmd-list-sub">No todos</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">Reports</div>
        </div>
        <div className="cmd-panel-body">
          {reports.map((report) => (
            <div className="cmd-list-row" key={report.id}>
              <div>
                <div className="cmd-list-title">
                  {report.periodLabel} · {report.status}
                </div>
                <div className="cmd-list-sub" style={{ whiteSpace: "pre-wrap" }}>
                  {report.body}
                </div>
                {report.reviewNote ? (
                  <div className="cmd-list-sub">Kane: {report.reviewNote}</div>
                ) : null}
              </div>
            </div>
          ))}
          {reports.length === 0 ? (
            <div className="cmd-list-sub">No reports yet</div>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
