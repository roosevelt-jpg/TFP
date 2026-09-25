import { AdminShell } from "@/components/admin/AdminShell";
import {
  formatGbp,
  getTrainingPageData,
  relativeFreshness,
} from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

function coachBadgeClass(status: "healthy" | "degraded" | "unknown") {
  if (status === "healthy") return "cmd-badge cmd-badge-live";
  if (status === "degraded") return "cmd-badge cmd-badge-issue";
  return "cmd-badge cmd-badge-calculated";
}

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
        <span className="cmd-freshness">
          Leaderboard ·{" "}
          {data.leaderboard.measurable
            ? data.leaderboard.freshness
            : "not measurable yet"}
        </span>
      </div>

      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="training.kpi.leaderboard">
            {cms["training.kpi.leaderboard"] ?? "Leaderboard freshness"}
          </div>
          <div className="cmd-kpi-value" style={{ fontSize: "1.15rem" }}>
            {data.leaderboard.measurable
              ? data.leaderboard.freshness
              : "not measurable yet"}
          </div>
          <div className="cmd-kpi-foot">
            <span
              className={
                data.leaderboard.measurable
                  ? "cmd-badge cmd-badge-recorded"
                  : "cmd-badge cmd-badge-calculated"
              }
            >
              {data.leaderboard.measurable
                ? data.leaderboard.source
                : "No n8n leaderboard pull yet"}
            </span>
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="training.kpi.coach">
            {cms["training.kpi.coach"] ?? "WhatsApp coach"}
          </div>
          <div className="cmd-kpi-value" style={{ fontSize: "1.15rem" }}>
            {data.coachHealth.status}
          </div>
          <div className="cmd-kpi-foot">
            <span className={coachBadgeClass(data.coachHealth.status)}>
              {data.coachHealth.detail}
            </span>
            {data.coachHealth.lastInboundAt ? (
              <span className="cmd-list-sub" style={{ display: "block" }}>
                Inbound {relativeFreshness(data.coachHealth.lastInboundAt)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Silent ({data.silentDays}+ days)</div>
          <div className="cmd-kpi-value">{data.silentCount}</div>
          <div className="cmd-kpi-foot">
            <span className="cmd-badge cmd-badge-recorded">
              Enrolment updatedAt
            </span>
          </div>
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
              {cms["training.panel.attention"] ?? "Silent members"}
            </div>
            <div className="cmd-panel-sub">
              No enrolment update in {data.silentDays}+ days
            </div>
          </div>
          <div className="cmd-panel-body">
            {data.silent.length === 0 ? (
              <div className="cmd-list-sub">None silent right now</div>
            ) : (
              data.silent.map((row) => (
                <div className="cmd-list-row" key={row.id}>
                  <div>
                    <div className="cmd-list-title">
                      {row.person.name ?? row.person.email}
                    </div>
                    <div className="cmd-list-sub">
                      Week {row.currentWeek} of 8 · {row.status} · last{" "}
                      {relativeFreshness(row.updatedAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
