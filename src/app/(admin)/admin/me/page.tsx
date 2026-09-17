import { AdminShell } from "@/components/admin/AdminShell";
import { MyDeskClient } from "@/components/admin/MyDeskClient";
import { db } from "@/db";
import { requireAdminSession } from "@/lib/auth/session";
import { startOfUtcDay, requestNow } from "@/lib/admin/request-time";
import { personKeyForRole, staffPerson } from "@/lib/admin/staff";
import { redirect } from "next/navigation";

function shortcutsForRole(role: string) {
  switch (role) {
    case "leah":
      return [
        { href: "/admin/money", label: "Money / finance upload" },
        { href: "/admin/growth/whatsapp", label: "WhatsApp inbox" },
        { href: "/admin/email", label: "Email" },
      ];
    case "lemoni":
      return [
        { href: "/admin/coaching", label: "Coaching pipeline" },
        { href: "/admin/content", label: "Content studio" },
        { href: "/admin/growth/instagram", label: "Instagram DMs" },
        { href: "/admin/cms", label: "Landing CMS" },
      ];
    case "indigo":
      return [
        { href: "/admin/integrations", label: "Integrations health" },
        { href: "/admin/meta", label: "Meta" },
        { href: "/admin/growth/telegram", label: "Telegram ops" },
      ];
    case "asim":
      return [{ href: "/admin/fulfilment", label: "Fulfilment" }];
    default:
      return [];
  }
}

export default async function MyDeskPage() {
  const session = await requireAdminSession([
    "kane",
    "leah",
    "lemoni",
    "indigo",
    "asim",
    "viewer",
  ]);

  if (session.user.role === "kane") {
    redirect("/admin/team");
  }

  const personKey = personKeyForRole(session.user.role);
  if (!personKey) {
    return (
      <AdminShell titleKey="me">
        <div className="cmd-panel">
          <div className="cmd-panel-body">
            Viewer accounts have no scorecard. Ask Kane to assign a role.
          </div>
        </div>
      </AdminShell>
    );
  }

  const person = staffPerson(personKey)!;
  const today = startOfUtcDay(await requestNow());

  const [kpis, todos, reports] = await Promise.all([
    db.kpiValue.findMany({
      where: { personKey, date: today },
      orderBy: { kpiId: "asc" },
    }),
    db.staffTodo.findMany({
      where: {
        status: "open",
        OR: [{ userId: session.user.id }, { personKey, userId: null }],
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    }),
    db.staffReport.findMany({
      where: { authorUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <AdminShell titleKey="me">
      <MyDeskClient
        personName={person.name}
        roleTitle={person.title}
        shortcuts={shortcutsForRole(session.user.role)}
        kpis={kpis.map((k) => ({
          id: k.id,
          kpiId: k.kpiId,
          value: k.value,
          label: k.label,
        }))}
        todos={todos.map((t) => ({
          id: t.id,
          title: t.title,
          dueAt: t.dueAt?.toISOString() ?? null,
          status: t.status,
        }))}
        reports={reports.map((r) => ({
          id: r.id,
          periodLabel: r.periodLabel,
          status: r.status,
          submittedAt: r.submittedAt?.toISOString() ?? null,
          reviewNote: r.reviewNote,
        }))}
      />
    </AdminShell>
  );
}

