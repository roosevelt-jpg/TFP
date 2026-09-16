import { AdminShell } from "@/components/admin/AdminShell";
import { getFulfilmentPageData } from "@/lib/admin/queries/pages";
import { getCmsMap } from "@/lib/cms/store";

export default async function FulfilmentPage() {
  const [data, cms] = await Promise.all([
    getFulfilmentPageData(),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="fulfilment">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="fulfilment.lead">
          {cms["fulfilment.lead"] ??
            `${data.rate}% of recent UK orders dispatched within 24h.`}
        </div>
      </div>

      <div className="cmd-section-note" data-cms="fulfilment.note">
        {cms["fulfilment.note"] ??
          "Bundle parent flags are ignored — component tracking drives these counts."}
      </div>

      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="fulfilment.kpi.dispatch">
            {cms["fulfilment.kpi.dispatch"] ?? "24h dispatch rate"}
          </div>
          <div className="cmd-kpi-value">{data.rate}%</div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="fulfilment.kpi.open">
            {cms["fulfilment.kpi.open"] ?? "Open unfulfilled"}
          </div>
          <div className="cmd-kpi-value">{data.open.length}</div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="fulfilment.kpi.gaps">
            {cms["fulfilment.kpi.gaps"] ?? "Component gaps"}
          </div>
          <div className="cmd-kpi-value" style={{ color: "var(--cmd-red)" }}>
            {data.gaps}
          </div>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title" data-cms="fulfilment.panel.open">
            {cms["fulfilment.panel.open"] ?? "Open unfulfilled"}
          </div>
        </div>
        <div className="cmd-panel-body flush">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Paid</th>
                <th className="num">Gaps</th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              {data.open.map((row) => (
                <tr key={row.id}>
                  <td className="cell-strong">
                    {row.order.orderName ?? row.order.shopifyOrderId}
                  </td>
                  <td>
                    {row.paidAt?.toLocaleString("en-GB") ?? "—"}
                  </td>
                  <td className="num">{row.componentGaps}</td>
                  <td>{row.region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
