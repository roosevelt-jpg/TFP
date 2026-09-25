import { AdminShell } from "@/components/admin/AdminShell";
import { formatGbp, getCoachingPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function CoachingPage() {
  await requireAdminSession(["kane", "lemoni"]);
  const [data, cms] = await Promise.all([
    getCoachingPageData(),
    getCmsMap("admin"),
  ]);
  const pct = Math.round((data.cashMtd / data.targetPence) * 100);

  return (
    <AdminShell titleKey="coaching">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="coaching.lead">
          {cms["coaching.lead"] ??
            `Cash collected MTD ${formatGbp(data.cashMtd)} vs target ${formatGbp(data.targetPence)} — ${pct}%.`}
        </div>
      </div>

      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">DMs qualified MTD</div>
          <div className="cmd-kpi-value">{data.dmQualifiedMtd}</div>
          <div className="cmd-kpi-foot">
            <span className="cmd-badge cmd-badge-recorded">
              High-intent threads · blended
            </span>
          </div>
        </div>
        {!data.dmPerSetterMeasurable ? (
          <div className="cmd-kpi-card">
            <div className="cmd-kpi-label">DMs per setter</div>
            <div className="cmd-kpi-value" style={{ fontSize: "1.1rem" }}>
              not measurable yet
            </div>
            <div className="cmd-kpi-foot">
              <span className="cmd-badge cmd-badge-calculated">
                LeadThread.setterKey unset
              </span>
            </div>
          </div>
        ) : (
          <div className="cmd-kpi-card">
            <div className="cmd-kpi-label">DMs per setter (MTD)</div>
            <div className="cmd-kpi-value" style={{ fontSize: "1.1rem" }}>
              {data.dmBySetter
                .map((r) => `${r.setter}: ${r.count}`)
                .join(" · ")}
            </div>
            <div className="cmd-kpi-foot">
              <span className="cmd-badge cmd-badge-verified">
                LeadThread.setterKey
              </span>
            </div>
          </div>
        )}
        {!data.pipelineMeasurable ? (
          <div className="cmd-kpi-card">
            <div className="cmd-kpi-label">Setter pipeline</div>
            <div className="cmd-kpi-value" style={{ fontSize: "1.1rem" }}>
              not measurable yet
            </div>
            <div className="cmd-kpi-foot">
              <span className="cmd-badge cmd-badge-calculated">
                No Call rows MTD
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {data.pipelineMeasurable ? (
        <div className="cmd-panel" style={{ marginBottom: "1.25rem" }}>
          <div className="cmd-panel-head">
            <div>
              <div
                className="cmd-panel-title"
                data-cms="coaching.panel.setters"
              >
                {cms["coaching.panel.setters"] ?? "Per-setter pipeline (MTD)"}
              </div>
              <div
                className="cmd-panel-sub"
                data-cms="coaching.panel.settersSub"
              >
                {cms["coaching.panel.settersSub"] ??
                  "From Call outcomes · paid stage not attributable"}
              </div>
            </div>
          </div>
          <div className="cmd-panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Setter</th>
                  <th className="num">Booked</th>
                  <th className="num">Held</th>
                  <th className="num">Closed</th>
                  <th className="num">No-show</th>
                  <th className="num">Cash on calls</th>
                  <th>DMs / paid</th>
                </tr>
              </thead>
              <tbody>
                {data.setterPipeline.map((row) => (
                  <tr key={row.setter}>
                    <td className="cell-strong">{row.setter}</td>
                    <td className="num">{row.booked}</td>
                    <td className="num">{row.held}</td>
                    <td className="num">{row.closed}</td>
                    <td className="num">{row.noShow}</td>
                    <td className="num">
                      {formatGbp(row.cashCollectedPence)}
                    </td>
                    <td className="cell-muted">
                      {row.dmsQualifiedMeasurable
                        ? `${row.dmsQualified} DM${row.dmsQualified === 1 ? "" : "s"} / paid not measurable yet`
                        : "DMs not measurable yet / paid not measurable yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title" data-cms="coaching.panel.tiers">
              {cms["coaching.panel.tiers"] ?? "Active tiers"}
            </div>
          </div>
          <div className="cmd-panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th className="num">Active</th>
                  <th className="num">Book value</th>
                </tr>
              </thead>
              <tbody>
                {data.tiers.map((tier) => (
                  <tr key={tier.tier ?? "unknown"}>
                    <td>{tier.tier ?? "—"}</td>
                    <td className="num">{tier._count}</td>
                    <td className="num">{formatGbp(tier._sum.pricePence ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div>
              <div
                className="cmd-panel-title"
                data-cms="coaching.panel.pending"
              >
                {cms["coaching.panel.pending"] ??
                  "Payments pending onboarding"}
              </div>
              <div
                className="cmd-panel-sub"
                data-cms="coaching.panel.pendingSub"
              >
                {cms["coaching.panel.pendingSub"] ??
                  "Detected by amount / product"}
              </div>
            </div>
          </div>
          <div className="cmd-panel-body">
            {data.pending.map((row) => (
              <div className="cmd-alert-card p1" key={row.id}>
                <div>
                  <div className="cmd-alert-id">PY1</div>
                  <div className="cmd-alert-what">
                    {formatGbp(row.pricePence)} {row.tier} —{" "}
                    {row.person.name ?? row.person.email}
                  </div>
                  <div className="cmd-alert-meta">
                    <span>Manual onboarding required</span>
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
