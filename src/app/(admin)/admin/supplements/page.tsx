import { AdminShell } from "@/components/admin/AdminShell";
import { formatGbp, getSupplementsPageData } from "@/lib/admin/queries/pages";
import { getCmsMap } from "@/lib/cms/store";

export default async function SupplementsPage() {
  const [data, cms] = await Promise.all([
    getSupplementsPageData(),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="supplements">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="supplements.lead">
          {cms["supplements.lead"] ??
            `Yesterday: ${data.orderCount} orders, ${formatGbp(data.net)} net revenue, ${formatGbp(data.contribution)} contribution.`}
        </div>
        <span className="cmd-freshness">Shopify · {data.freshness}</span>
      </div>

      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="supplements.kpi.stackOrders">
            {cms["supplements.kpi.stackOrders"] ?? "Stack orders"}
          </div>
          <div className="cmd-kpi-value">{data.stackShare}%</div>
          <div className="cmd-kpi-foot">
            <span className="cmd-badge cmd-badge-verified">Verified</span>
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label" data-cms="supplements.kpi.subs">
            {cms["supplements.kpi.subs"] ?? "Subscription count"}
          </div>
          <div className="cmd-kpi-value">{data.subs}</div>
          <div className="cmd-kpi-foot">
            <span className="cmd-badge cmd-badge-recorded">Mirror, read-only</span>
          </div>
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title" data-cms="supplements.panel.topSkus">
              {cms["supplements.panel.topSkus"] ?? "Top SKUs, yesterday"}
            </div>
          </div>
          <div className="cmd-panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th className="num">Units</th>
                  <th className="num">Net revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topSkus.map((sku) => (
                  <tr key={sku.sku}>
                    <td className="cell-strong">{sku.sku}</td>
                    <td className="num">{sku.units}</td>
                    <td className="num">{formatGbp(sku.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div>
              <div className="cmd-panel-title" data-cms="supplements.panel.stock">
                {cms["supplements.panel.stock"] ?? "Stock cover"}
              </div>
              <div className="cmd-panel-sub" data-cms="supplements.panel.stockSub">
                {cms["supplements.panel.stockSub"] ??
                  "Stack limited by scarcest component"}
              </div>
            </div>
          </div>
          <div className="cmd-panel-body">
            {data.stock.map((item) => (
              <div key={item.id}>
                <div className="cmd-kpi-mini">
                  <span className="l">{item.title}</span>
                  <span
                    className="v"
                    style={{
                      color:
                        (item.daysOfCover ?? 99) < 20
                          ? "var(--cmd-red)"
                          : (item.daysOfCover ?? 99) < 30
                            ? "var(--cmd-amber)"
                            : undefined,
                    }}
                  >
                    {item.daysOfCover?.toFixed(0) ?? "—"}d
                  </span>
                </div>
                <div
                  className={`cmd-progress ${(item.daysOfCover ?? 99) < 20 ? "red" : "green"}`}
                  style={{ marginBottom: 10 }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, ((item.daysOfCover ?? 0) / 60) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
