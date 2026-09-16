import { AdminShell } from "@/components/admin/AdminShell";
import { formatGbp, getMetaPageData } from "@/lib/admin/queries/pages";
import { getCmsMap } from "@/lib/cms/store";
import {
  calculateBreakEvenAmer,
  getThousandDayGate,
} from "@/lib/metrics/economics";

export default async function MetaPage() {
  const [data, economics, gate, cms] = await Promise.all([
    getMetaPageData(),
    calculateBreakEvenAmer(),
    getThousandDayGate(),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="meta">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="meta.lead">
          {cms["meta.lead"] ??
            `aMER ${economics.amer.toFixed(1)}x · new-customer CAC ${formatGbp(economics.blendedCacPence)} vs break-even ${economics.breakEvenAmer.toFixed(2)}x.`}
        </div>
      </div>

      <div className="cmd-section-note" data-cms="meta.note">
        {cms["meta.note"] ??
          "Nathan ladder: Layer 2 — proof of the cold hook. Attribution settings never touched. Break-even is calculated from COGS, fees and fulfilment inputs below — never hardcoded."}
      </div>

      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="meta.kpi.gate">
            {cms["meta.kpi.gate"] ?? "£1,000/day gate"}
          </div>
          <div className="cmd-kpi-value">
            {formatGbp(gate.purchaseValuePence)}
          </div>
          <div className="cmd-kpi-foot">
            <span
              className={`cmd-badge ${gate.hit ? "cmd-badge-live" : "cmd-badge-p2"}`}
            >
              {gate.hit ? "Hit" : `${gate.progress}% of £1,000`}
            </span>
          </div>
          <div className="cmd-progress" style={{ marginTop: 8 }}>
            <div style={{ width: `${gate.progress}%` }} />
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="meta.kpi.cac">
            {cms["meta.kpi.cac"] ?? "Blended CAC"}
          </div>
          <div className="cmd-kpi-value">
            {formatGbp(economics.blendedCacPence)}
          </div>
          <div className="cmd-kpi-foot">
            <span className="cmd-badge cmd-badge-calculated">Calculated</span>
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="meta.kpi.breakEven">
            {cms["meta.kpi.breakEven"] ?? "Break-even aMER"}
          </div>
          <div className="cmd-kpi-value">
            {economics.breakEvenAmer.toFixed(2)}x
          </div>
          <div className="cmd-kpi-foot">
            <span className="cmd-badge cmd-badge-calculated">Calculated</span>
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="meta.kpi.adSets">
            {cms["meta.kpi.adSets"] ?? "Active ad sets (7d)"}
          </div>
          <div className="cmd-kpi-value">{data.adSets.length}</div>
          <div className="cmd-kpi-foot">
            <span className="cmd-badge cmd-badge-verified">Verified</span>
          </div>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title" data-cms="meta.panel.inputs">
              {cms["meta.panel.inputs"] ?? "Break-even inputs"}
            </div>
            <div className="cmd-panel-sub" data-cms="meta.panel.inputsSub">
              {cms["meta.panel.inputsSub"] ??
                "Kane signs off COGS — dashboard shows the calculation"}
            </div>
          </div>
        </div>
        <div className="cmd-panel-body">
          <div className="cmd-kpi-mini">
            <span className="l">New-customer net (7d)</span>
            <span className="v">{formatGbp(economics.inputs.netPence)}</span>
          </div>
          <div className="cmd-kpi-mini">
            <span className="l">COGS</span>
            <span className="v">{formatGbp(economics.inputs.cogsPence)}</span>
          </div>
          <div className="cmd-kpi-mini">
            <span className="l">Shipping</span>
            <span className="v">{formatGbp(economics.inputs.shippingPence)}</span>
          </div>
          <div className="cmd-kpi-mini">
            <span className="l">Payment fees (calc)</span>
            <span className="v">{formatGbp(economics.inputs.feePence)}</span>
          </div>
          <div className="cmd-kpi-mini">
            <span className="l">Ad spend (7d)</span>
            <span className="v">{formatGbp(economics.inputs.adSpendPence)}</span>
          </div>
          <div className="cmd-kpi-mini">
            <span className="l">New customers</span>
            <span className="v">{economics.inputs.newCustomers}</span>
          </div>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title" data-cms="meta.panel.adSets">
              {cms["meta.panel.adSets"] ?? "Performance per ad set"}
            </div>
            <div className="cmd-panel-sub" data-cms="meta.panel.adSetsSub">
              {cms["meta.panel.adSetsSub"] ??
                "7-day click and incremental, never blended"}
            </div>
          </div>
        </div>
        <div className="cmd-panel-body flush">
          <table>
            <thead>
              <tr>
                <th>Ad set</th>
                <th className="num">Spend</th>
                <th className="num">aMER 7d-click</th>
                <th className="num">aMER incr.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.adSets.map((set) => (
                <tr key={set.id}>
                  <td className="cell-strong">{set.name}</td>
                  <td className="num">{formatGbp(set.spend)}</td>
                  <td
                    className="num"
                    style={{
                      color:
                        set.amer7d < economics.breakEvenAmer
                          ? "var(--cmd-red)"
                          : "var(--cmd-green)",
                    }}
                  >
                    {set.amer7d.toFixed(1)}x
                  </td>
                  <td className="num">{set.amerIncr.toFixed(1)}x</td>
                  <td>
                    <span
                      className={`cmd-badge ${set.amer7d < economics.breakEvenAmer ? "cmd-badge-issue" : "cmd-badge-live"}`}
                    >
                      {set.amer7d < economics.breakEvenAmer
                        ? "Below break-even"
                        : "Stable"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title" data-cms="meta.panel.changeLog">
            {cms["meta.panel.changeLog"] ?? "Change log"}
          </div>
        </div>
        <div className="cmd-panel-body">
          {data.changeEvents.length === 0 ? (
            <div className="cmd-list-sub">No change events recorded.</div>
          ) : (
            data.changeEvents.map((ev) => (
              <div className="cmd-list-row" key={ev.id}>
                <div>
                  <div className="cmd-list-title">
                    {ev.changeType} · {ev.objectId}
                  </div>
                  <div className="cmd-list-sub">
                    {ev.occurredAt.toLocaleString("en-GB")} — averages split
                    before/after this point
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
