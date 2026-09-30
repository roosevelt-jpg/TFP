import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { getFunnelPageData } from "@/lib/admin/queries/funnel";
import { requireAdminSession } from "@/lib/auth/session";

export default function FunnelMetricsPage() {
  return (
    <Suspense fallback={<FunnelFallback />}>
      <FunnelMetricsContent />
    </Suspense>
  );
}

function FunnelFallback() {
  return (
    <div className="tfp-command" data-theme="dark">
      <div className="cmd-app">
        <div className="cmd-main" style={{ padding: 24 }}>
          <div className="cmd-page-lead">
            <div className="cmd-page-lead-line">Loading funnel metrics…</div>
          </div>
          <div className="cmd-kpi-grid">
            {Array.from({ length: 7 }).map((_, i) => (
              <div className="cmd-kpi-card" key={i}>
                <div className="cmd-kpi-label">…</div>
                <div className="cmd-kpi-value">—</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

async function FunnelMetricsContent() {
  await requireAdminSession(["kane", "lemoni", "leah"]);
  const data = await getFunnelPageData();
  const k = data.metrics;
  const pct = (value: number | null) => (value == null ? "—" : `${value}%`);

  return (
    <AdminShell titleKey="funnel">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          Funnel performance (last 7 days). Rates use landing sessions, checkout
          starters, and purchases — not raw event counts.
        </div>
      </div>

      <div className="cmd-kpi-grid">
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Landing → checkout</div>
          <div className="cmd-kpi-value">{pct(k.landingToCheckoutPct)}</div>
          <div className="cmd-kpi-foot">
            {k.checkoutStarters} starts / {k.landingSessions} sessions
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Checkout completion</div>
          <div className="cmd-kpi-value">{pct(k.checkoutCompletionPct)}</div>
          <div className="cmd-kpi-foot">
            {k.purchasers} paid / {k.checkoutStarters} starts
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Lead capture</div>
          <div className="cmd-kpi-value">{pct(k.leadCapturePct)}</div>
          <div className="cmd-kpi-foot">
            {k.leads} leads / {k.landingSessions} sessions
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Recovery conversion</div>
          <div className="cmd-kpi-value">{pct(k.recoveryConversionPct)}</div>
          <div className="cmd-kpi-foot">
            {k.recovered} recovered / {k.abandoned} abandoned
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Activation within 24h</div>
          <div className="cmd-kpi-value">{pct(k.activationRatePct)}</div>
          <div className="cmd-kpi-foot">
            {k.activatedWithin24h} / {k.purchasers} purchasers
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Attribution coverage</div>
          <div className="cmd-kpi-value">{pct(k.attribution.pct)}</div>
          <div className="cmd-kpi-foot">
            {k.attribution.covered} / {k.attribution.total} purchases
          </div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Human response</div>
          <div className="cmd-kpi-value">
            {k.sla.averageMinutes == null ? "—" : `${k.sla.averageMinutes}m`}
          </div>
          <div className="cmd-kpi-foot">{k.sla.awaiting} still waiting</div>
        </div>
        <div className="cmd-kpi-card">
          <div className="cmd-kpi-label">Open incidents</div>
          <div className="cmd-kpi-value">{k.openIncidents}</div>
          <div className="cmd-kpi-foot">
            Delivery failures {k.deliveryFailures}
          </div>
        </div>
      </div>

      <div className="cmd-panel" style={{ marginTop: 16 }}>
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">Message delivery health</div>
        </div>
        <div className="cmd-panel-body">
          {k.delivery.length === 0 ? (
            <div className="cmd-list-sub">No outbound messages in this window</div>
          ) : (
            k.delivery.map((row) => (
              <div className="cmd-list-row" key={row.channel}>
                <div>
                  <div className="cmd-list-title">{row.channel}</div>
                  <div className="cmd-list-sub">
                    {row.delivered} delivered / {row.accepted} accepted ·{" "}
                    {pct(row.pct)}
                  </div>
                </div>
              </div>
            ))
          )}
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
                    {e.customerId
                      ? ` · customer ${e.customerId.slice(0, 8)}…`
                      : ""}
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
