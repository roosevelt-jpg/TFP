import { AdminShell } from "@/components/admin/AdminShell";
import { formatGbp, getTrainingPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function TrainingPage() {
  await requireAdminSession(["kane", "lemoni"]);
  const [data, cms] = await Promise.all([
    getTrainingPageData(),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="training">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="training.lead">
          {cms["training.lead"] ??
            `${data.active} active members, ${formatGbp(data.mrr)} MRR.`}
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title" data-cms="training.panel.byWeek">
              {cms["training.panel.byWeek"] ?? "Members by week of 8"}
            </div>
          </div>
          <div className="cmd-panel-body">
            {Array.from({ length: 8 }, (_, i) => i + 1).map((week) => {
              const count =
                data.byWeek.find((w) => w.currentWeek === week)?._count ?? 0;
              return (
                <div className="cmd-kpi-mini" key={week}>
                  <span className="l">Week {week}</span>
                  <span className="v">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div
              className="cmd-panel-title"
              data-cms="training.panel.attention"
            >
              {cms["training.panel.attention"] ?? "Members needing attention"}
            </div>
          </div>
          <div className="cmd-panel-body">
            {data.silent.map((row) => (
              <div className="cmd-list-row" key={row.id}>
                <div>
                  <div className="cmd-list-title">
                    {row.person.name ?? row.person.email}
                  </div>
                  <div className="cmd-list-sub">
                    Week {row.currentWeek} of 8 · {row.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
