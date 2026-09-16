import { AdminShell } from "@/components/admin/AdminShell";
import { formatGbp, getCoachingPageData } from "@/lib/admin/queries/pages";
import { getCmsMap } from "@/lib/cms/store";

export default async function CoachingPage() {
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
