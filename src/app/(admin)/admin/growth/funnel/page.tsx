import { AdminShell } from "@/components/admin/AdminShell";
import { getFunnelPageData } from "@/lib/admin/queries/funnel";
import { requireAdminSession } from "@/lib/auth/session";

export default async function FunnelMetricsPage() {
  await requireAdminSession(["kane", "lemoni", "leah"]);
  const data = await getFunnelPageData();
  const k = data.kpis;

  return (
    <AdminShell titleKey="funnel">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          Funnel performance (last 7 days) — leads → checkout → pay → activation.
          Recovery and payment-failure cases surface here for ops.
        </div>
      </div>

      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Leads (7d)</div>
          <div className="cmd-kpi-value">{k.leads7}</div>
          <div className="cmd-kpi-foot">30d: {k.leads30}</div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Checkout started</div>
          <div className="cmd-kpi-value">{k.checkouts7}</div>
          <div className="cmd-kpi-foot">
            Lead→checkout {k.landingToCheckoutPct ?? "—"}%
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Payments</div>
          <div className="cmd-kpi-value">{k.payments7}</div>
          <div className="cmd-kpi-foot">
            Checkout→pay {k.checkoutToPayPct ?? "—"}%
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Activation rate</div>
          <div className="cmd-kpi-value">
            {k.activationRatePct != null ? `${k.activationRatePct}%` : "—"}
          </div>
          <div className="cmd-kpi-foot">{k.activations7} activated</div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Abandoned</div>
          <div className="cmd-kpi-value">{k.abandoned7}</div>
          <div className="cmd-kpi-foot">
            Recovery sends {k.recoveries7} · rate {k.recoveryRatePct ?? "—"}%
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Payment failed</div>
          <div className="cmd-kpi-value">{k.paymentFailed7}</div>
          <div className="cmd-kpi-foot">
            Incomplete onboarding {k.onboardingIncomplete}
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Workflows</div>
          <div className="cmd-kpi-value">{k.workflowsRunning}</div>
          <div className="cmd-kpi-foot">
            Failed/stopped 7d: {k.workflowsFailed} · outbound fails{" "}
            {k.outboundFailed7}
          </div>
        </div>
      </div>

      <div className="cmd-panel" style={{ marginTop: 16 }}>
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">Recent funnel events</div>
        </div>
        <div className="cmd-panel-body">
          {data.recent.length === 0 ? (
            <div className="cmd-list-sub">No events yet</div>
          ) : (
            data.recent.map((e) => (
              <div className="cmd-list-row" key={e.id}>
                <div>
                  <div className="cmd-list-title">{e.eventName}</div>
                  <div className="cmd-list-sub">
                    {e.source} · {e.occurredAt.toLocaleString("en-GB")}
                    {e.customerId ? ` · customer ${e.customerId.slice(0, 8)}…` : ""}
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
