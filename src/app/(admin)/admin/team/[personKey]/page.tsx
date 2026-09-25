import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { db } from "@/db";
import { staffPerson } from "@/lib/admin/staff";
import { requireAdminSession } from "@/lib/auth/session";
import { computeAffiliateScorecard } from "@/lib/scorecards/affiliates";
import { formatGbp } from "@/lib/admin/format";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ personKey: string }>;
};

export default async function TeamPersonPage({ params }: Props) {
  await requireAdminSession(["kane"]);
  const { personKey } = await params;
  const person = staffPerson(personKey);
  if (!person) notFound();

  const [kpis, todos, reports, affiliateScorecard] = await Promise.all([
    db.kpiValue.findMany({
      where: { personKey },
      orderBy: [{ date: "desc" }, { kpiId: "asc" }],
      take: 40,
    }),
    db.staffTodo.findMany({
      where: { personKey },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 30,
    }),
    db.staffReport.findMany({
      where: { personKey },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    personKey === "lemoni" ? computeAffiliateScorecard() : Promise.resolve(null),
  ]);

  return (
    <AdminShell titleKey={`${person.name} scorecard`}>
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          <Link href="/admin/team">← Team</Link> · {person.title}
        </div>
      </div>

      {affiliateScorecard ? (
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Affiliate scorecard</div>
            <div className="cmd-panel-sub">
              Register from Affiliate + codes · warehouse link when
              WarehouseOrder.discountCode is set
            </div>
          </div>
          <div className="cmd-panel-body">
            <div className="cmd-kpi-grid" style={{ marginBottom: 12 }}>
              <div className="cmd-kpi-mini">
                <span className="l">Affiliates</span>
                <span className="v">{affiliateScorecard.affiliateCount}</span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">Codes</span>
                <span className="v">{affiliateScorecard.codeCount}</span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">AK1 register %</span>
                <span className="v">
                  {affiliateScorecard.registerIntegrityPct}
                  {typeof affiliateScorecard.registerIntegrityPct === "number"
                    ? "%"
                    : ""}
                </span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">AK2 active %</span>
                <span className="v">
                  {affiliateScorecard.activeRatePct}
                  {typeof affiliateScorecard.activeRatePct === "number"
                    ? "%"
                    : ""}
                </span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">Linked warehouse orders</span>
                <span className="v">
                  {affiliateScorecard.warehouseOrdersLinked
                    ? affiliateScorecard.linkedWarehouseOrderCount
                    : "not measurable yet"}
                </span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">AK5 net contribution</span>
                <span className="v">{affiliateScorecard.ak5}</span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">AK6 payback ratio</span>
                <span className="v">{affiliateScorecard.ak6}</span>
              </div>
            </div>

            {affiliateScorecard.codes.length > 0 ? (
              <div className="cmd-list-sub" style={{ marginBottom: 12 }}>
                Codes: {affiliateScorecard.codes.join(", ")}
              </div>
            ) : (
              <div className="cmd-list-sub" style={{ marginBottom: 12 }}>
                No affiliate codes on register yet
              </div>
            )}

            {affiliateScorecard.rows.map((row) => (
              <div className="cmd-list-row" key={row.affiliateId}>
                <div>
                  <div className="cmd-list-title">
                    {row.name}
                    {row.agreementSigned ? "" : " · unsigned"}
                    {row.codes.length
                      ? ` · ${row.codes.join(", ")}`
                      : " · no code"}
                  </div>
                  <div className="cmd-list-sub">
                    Register orders {row.registerOrders}
                    {row.linkedWarehouseOrders > 0
                      ? ` · linked warehouse ${row.linkedWarehouseOrders} (${formatGbp(row.linkedNetPence)}; discount ${formatGbp(row.linkedDiscountPence)})`
                      : " · warehouse not linked"}
                    {row.linkedProgrammePurchases > 0
                      ? ` · programme promo ${row.linkedProgrammePurchases}`
                      : ""}
                    {row.lastPostLink ? " · posted" : " · no post link"}
                    {" · AK5/AK6: not measurable yet"}
                  </div>
                </div>
              </div>
            ))}

            {affiliateScorecard.rows.length === 0 ? (
              <div className="cmd-list-sub">No affiliates on register</div>
            ) : null}

            <div className="cmd-list-sub" style={{ marginTop: 12 }}>
              Attribution gaps: {affiliateScorecard.attributionGaps.join("; ")}
            </div>
          </div>
        </div>
      ) : null}

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">KPI history</div>
          </div>
          <div className="cmd-panel-body">
            {kpis.length === 0 ? (
              <div className="cmd-list-sub">not measurable yet</div>
            ) : (
              kpis.map((kpi) => (
                <div className="cmd-list-row" key={kpi.id}>
                  <div>
                    <div className="cmd-list-title">
                      {kpi.kpiId}: {kpi.value}
                    </div>
                    <div className="cmd-list-sub">
                      {kpi.date.toISOString().slice(0, 10)} · {kpi.label}
                      {kpi.source ? ` · ${kpi.source}` : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Todos</div>
          </div>
          <div className="cmd-panel-body">
            {todos.map((todo) => (
              <div className="cmd-list-row" key={todo.id}>
                <div>
                  <div className="cmd-list-title">{todo.title}</div>
                  <div className="cmd-list-sub">
                    {todo.status}
                    {todo.dueAt
                      ? ` · due ${todo.dueAt.toLocaleString("en-GB")}`
                      : ""}
                  </div>
                </div>
              </div>
            ))}
            {todos.length === 0 ? (
              <div className="cmd-list-sub">No todos</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">Reports</div>
        </div>
        <div className="cmd-panel-body">
          {reports.map((report) => (
            <div className="cmd-list-row" key={report.id}>
              <div>
                <div className="cmd-list-title">
                  {report.periodLabel} · {report.status}
                </div>
                <div className="cmd-list-sub" style={{ whiteSpace: "pre-wrap" }}>
                  {report.body}
                </div>
                {report.reviewNote ? (
                  <div className="cmd-list-sub">Kane: {report.reviewNote}</div>
                ) : null}
              </div>
            </div>
          ))}
          {reports.length === 0 ? (
            <div className="cmd-list-sub">No reports yet</div>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
