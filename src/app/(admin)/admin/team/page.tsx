import { AdminShell } from "@/components/admin/AdminShell";
import { getTeamPageData } from "@/lib/admin/queries/pages";
import { getCmsMap } from "@/lib/cms/store";

const PEOPLE: Record<string, { name: string; role: string }> = {
  leah: { name: "Leah", role: "Finance & customer service" },
  lemoni: { name: "Lemoni", role: "Head of Affiliates + PA" },
  indigo: { name: "Indigo", role: "GHL / n8n automation" },
  asim: { name: "Asim", role: "UK pick & pack" },
};

export default async function TeamPage() {
  const [data, cms] = await Promise.all([
    getTeamPageData(),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="team">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="team.lead">
          {cms["team.lead"] ??
            "Each person's scorecard, checked daily by the CTO agent."}
        </div>
      </div>

      <div className="cmd-kpi-grid">
        {Object.entries(PEOPLE).map(([key, person]) => (
          <div className="cmd-person-card" key={key}>
            <div className="cmd-person-top">
              <div className="cmd-person-avatar">{person.name[0]}</div>
              <div>
                <div className="cmd-person-name">{person.name}</div>
                <div className="cmd-person-role">{person.role}</div>
              </div>
            </div>
            {(data.byPerson.get(key) ?? []).map((kpi) => (
              <div className="cmd-kpi-mini" key={kpi.id}>
                <span className="l">{kpi.kpiId}</span>
                <span className="v">{kpi.value}</span>
              </div>
            ))}
            {(data.byPerson.get(key) ?? []).length === 0 ? (
              <div className="cmd-list-sub">not measurable yet</div>
            ) : null}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
