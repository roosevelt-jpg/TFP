import { AdminShell } from "@/components/admin/AdminShell";
import { FinanceUploadForm } from "@/components/admin/FinanceUploadForm";
import { formatGbp, getMoneyPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function MoneyPage() {
  const session = await requireAdminSession(["kane", "leah"]);
  const hideTeamPay = session.user.role !== "kane";
  const [data, cms] = await Promise.all([
    getMoneyPageData(hideTeamPay),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="money">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="money.lead">
          {cms["money.lead"] ??
            "Cash today across accounts. Payments due in the next 14 days listed below."}
        </div>
        <span className="cmd-freshness">
          Leah&apos;s template · {data.freshness}
        </span>
      </div>

      <FinanceUploadForm />

      <div className="cmd-kpi-grid">
        {data.balances.map((b) => (
          <div className="cmd-kpi-card" key={b.id}>
            <div className="cmd-kpi-label">{b.account}</div>
            <div className="cmd-kpi-value">
              {b.currency.toUpperCase() === "GBP"
                ? formatGbp(b.balanceMinor)
                : `${b.currency.toUpperCase()} ${(b.balanceMinor / 100).toLocaleString("en-GB")}`}
            </div>
            <div className="cmd-kpi-foot">
              <span className={`cmd-badge cmd-badge-${b.label}`}>{b.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div>
              <div className="cmd-panel-title" data-cms="money.panel.mtd">
                {cms["money.panel.mtd"] ?? "MTD revenue by line"}
              </div>
              <div className="cmd-panel-sub" data-cms="money.panel.mtdSub">
                {cms["money.panel.mtdSub"] ?? "From warehouse orders"}
              </div>
            </div>
          </div>
          <div className="cmd-panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Line</th>
                  <th className="num">Net revenue</th>
                  <th className="num">COGS + ship</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((row) => (
                  <tr key={row.businessLine}>
                    <td className="cell-strong">{row.businessLine}</td>
                    <td className="num">{formatGbp(row._sum.netPence ?? 0)}</td>
                    <td className="num">
                      {formatGbp(
                        (row._sum.cogsPence ?? 0) +
                          (row._sum.shippingPence ?? 0),
                      )}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="cell-muted">Ad spend MTD</td>
                  <td className="num" colSpan={2}>
                    {formatGbp(data.adSpendPence)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title" data-cms="money.panel.due">
              {cms["money.panel.due"] ?? "Payments due"}
            </div>
          </div>
          <div className="cmd-panel-body">
            {data.due.map((row) => (
              <div className="cmd-list-row" key={row.id}>
                <div style={{ flex: 1 }}>
                  <div className="cmd-list-title">
                    {row.payee} — {row.category}
                  </div>
                  <div className="cmd-list-sub">
                    Due {row.dueDate.toLocaleDateString("en-GB")} · {row.status}
                    {row.isTeamPay ? " · team pay" : ""}
                  </div>
                </div>
                <span className="cell-strong cmd-mono">
                  {formatGbp(row.amountPence)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
