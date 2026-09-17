import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { listClients, backfillClientLinks } from "@/lib/admin/clients";
import { requireAdminSession } from "@/lib/auth/session";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ClientsPage({ searchParams }: Props) {
  await requireAdminSession(["kane", "lemoni", "leah"]);
  const { q } = await searchParams;
  await backfillClientLinks(50);
  const clients = await listClients({ q });

  return (
    <AdminShell titleKey="clients">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          Full client CRM — open any row for profile, plans, staff, sessions,
          payments and history.
        </div>
      </div>

      <form className="cmd-clients-search" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, email, phone, Instagram…"
          aria-label="Search clients"
        />
        <button type="submit" className="cmd-btn">
          Search
        </button>
      </form>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">
            {clients.length} client{clients.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="cmd-panel-body flush">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Joined</th>
                <th>Plan / tier</th>
                <th>Staff</th>
                <th className="num">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="cmd-list-sub" style={{ padding: 16 }}>
                      No clients yet. Buyers and warehouse people appear here
                      once captured.
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/clients/${c.id}`} className="cmd-client-link">
                        <span className="cmd-avatar cmd-avatar-sm">
                          {c.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.image} alt="" />
                          ) : (
                            <span>{initials(c.name)}</span>
                          )}
                        </span>
                        <span>
                          <span className="cmd-list-title">{c.name}</span>
                          <span className="cmd-list-sub">
                            {[c.email, c.phone].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>{c.joinedAt.toLocaleDateString("en-GB")}</td>
                    <td>
                      {c.tier ?? "—"}
                      {c.planStatus ? (
                        <div className="cmd-list-sub">{c.planStatus}</div>
                      ) : null}
                    </td>
                    <td>
                      {c.assignedStaff.length
                        ? c.assignedStaff.join(", ")
                        : "—"}
                    </td>
                    <td className="num">{c.sessionsTaken}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
