import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { KaneReviewQueue } from "@/components/admin/KaneReviewQueue";
import { StaffAccessPanel } from "@/components/admin/StaffAccessPanel";
import { db } from "@/db";
import { getTeamPageData } from "@/lib/admin/queries/pages";
import { listOpenInvites, listStaffUsers } from "@/lib/admin/invites";
import { STAFF_PEOPLE } from "@/lib/admin/staff";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function TeamPage() {
  await requireAdminSession(["kane"]);
  const [data, cms, users, invites, pendingReports, openTodos] =
    await Promise.all([
      getTeamPageData(),
      getCmsMap("admin"),
      listStaffUsers(),
      listOpenInvites(),
      db.staffReport.findMany({
        where: { status: "submitted" },
        orderBy: { submittedAt: "asc" },
        take: 20,
      }),
      db.staffTodo.groupBy({
        by: ["personKey"],
        where: { status: "open" },
        _count: { _all: true },
      }),
    ]);

  const todoCount = new Map(
    openTodos.map((row) => [row.personKey, row._count._all]),
  );

  return (
    <AdminShell titleKey="team">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="team.lead">
          {cms["team.lead"] ??
            "Each person's scorecard, checked daily by the CTO agent. Hold them accountable from their desks and reports."}
        </div>
      </div>

      <KaneReviewQueue
        reports={pendingReports.map((r) => ({
          id: r.id,
          personKey: r.personKey,
          periodLabel: r.periodLabel,
          body: r.body,
          submittedAt: r.submittedAt?.toISOString() ?? null,
        }))}
      />

      <div className="cmd-kpi-grid">
        {STAFF_PEOPLE.map((person) => (
          <Link
            className="cmd-person-card"
            key={person.personKey}
            href={`/admin/team/${person.personKey}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="cmd-person-top">
              <div className="cmd-person-avatar">{person.name[0]}</div>
              <div>
                <div className="cmd-person-name">{person.name}</div>
                <div className="cmd-person-role">{person.title}</div>
              </div>
            </div>
            {(data.byPerson.get(person.personKey) ?? []).map((kpi) => (
              <div className="cmd-kpi-mini" key={kpi.id}>
                <span className="l">{kpi.kpiId}</span>
                <span className="v">{kpi.value}</span>
              </div>
            ))}
            {(data.byPerson.get(person.personKey) ?? []).length === 0 ? (
              <div className="cmd-list-sub">not measurable yet</div>
            ) : null}
            <div className="cmd-list-sub" style={{ marginTop: 8 }}>
              {todoCount.get(person.personKey) ?? 0} open todos · open detail
            </div>
          </Link>
        ))}
      </div>

      <StaffAccessPanel
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          updatedAt: u.updatedAt.toISOString(),
          twoFactorEnabled: u.twoFactorEnabled,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </AdminShell>
  );
}
