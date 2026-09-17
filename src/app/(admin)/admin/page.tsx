import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminIcons } from "@/components/admin/icons";
import { formatGbp } from "@/lib/admin/format";
import { getCommandPageData } from "@/lib/admin/queries/command";
import { homePathForRole } from "@/lib/admin/staff";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function AdminCommandPage() {
  const session = await requireAdminSession([
    "kane",
    "leah",
    "lemoni",
    "indigo",
    "asim",
    "viewer",
  ]);
  if (session.user.role !== "kane") {
    redirect(homePathForRole(session.user.role));
  }

  const [data, cms] = await Promise.all([
    getCommandPageData(),
    getCmsMap("admin"),
  ]);

  const lead =
    cms["command.lead"] ??
    `Yesterday: ${data.lead.revenue} revenue across all lines, ${data.lead.adSpend} ad spend, ${data.lead.amer} aMER, ${data.lead.contribution} contribution. Cash today ${data.lead.cash}.`;

  return (
    <AdminShell titleKey="command">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="command.lead">
          {lead}
        </div>
        <span className="cmd-freshness">
          <AdminIcons name="clock" />
          Refreshed {data.freshness}
        </span>
      </div>

      <div className="cmd-section-note" data-cms="command.note">
        {cms["command.note"] ??
          `${data.openAlertCount} open alerts · ${data.pendingApprovalCount} approvals waiting. Reads only past this point: nothing sends, publishes or moves money without your tap.`}
      </div>

      <div className="cmd-kpi-grid">
        {data.kpis.map((kpi) => (
          <div className="cmd-kpi-card" key={kpi.cmsKey}>
            <div className="cmd-kpi-label" data-cms={`${kpi.cmsKey}.label`}>
              {cms[`${kpi.cmsKey}.label`] ?? kpi.label}
            </div>
            <div className="cmd-kpi-row">
              <span className="cmd-kpi-value" data-cms={`${kpi.cmsKey}.value`}>
                {cms[`${kpi.cmsKey}.value`] ?? kpi.value}
              </span>
              <span className={`cmd-kpi-delta ${kpi.deltaTone}`}>{kpi.delta}</span>
            </div>
            <div className="cmd-kpi-foot">
              <span
                className={`cmd-badge cmd-badge-${kpi.badge.toLowerCase()}`}
              >
                {kpi.badge}
              </span>
              <span className="cmd-freshness">{kpi.fresh}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cmd-two-col">
        <div>
          <div className="cmd-panel">
            <div className="cmd-panel-head">
              <div>
                <div className="cmd-panel-title">Open P1 alerts</div>
                <div className="cmd-panel-sub">
                  Money, customers, compliance or a system, broken now
                </div>
              </div>
              <Link href="/admin/alerts" className="cmd-btn cmd-btn-sm">
                View all
              </Link>
            </div>
            <div className="cmd-panel-body">
              {data.openAlerts.length === 0 ? (
                <div className="cmd-list-sub">No open alerts.</div>
              ) : (
                data.openAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`cmd-alert-card ${alert.severity}`}
                  >
                    <div>
                      <div className="cmd-alert-id">
                        {alert.ruleId} · {alert.severity.toUpperCase()}
                      </div>
                      <div className="cmd-alert-what">{alert.title}</div>
                      <div className="cmd-alert-meta">
                        <span>{alert.firedAt.toLocaleString("en-GB")}</span>
                        <span>{alert.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="cmd-panel">
            <div className="cmd-panel-head">
              <div>
                <div className="cmd-panel-title">Decisions waiting for approval</div>
                <div className="cmd-panel-sub">One approval authorises one action</div>
              </div>
              <Link href="/admin/alerts" className="cmd-btn cmd-btn-sm">
                Open log
              </Link>
            </div>
            <div className="cmd-panel-body">
              {data.pendingApprovals.length === 0 ? (
                <div className="cmd-list-sub">No pending approvals.</div>
              ) : (
                data.pendingApprovals.map((row) => (
                  <div key={row.id} className="cmd-approval-card">
                    <div className="cmd-approval-top">
                      <div>
                        <div className="cmd-alert-id">DRAFT</div>
                        <div className="cmd-approval-what">{row.action}</div>
                      </div>
                      <span className="cmd-badge cmd-badge-p2">Pending</span>
                    </div>
                    {row.specialistVerdict ? (
                      <div className="cmd-approval-check">
                        Specialist check: {row.specialistVerdict}
                      </div>
                    ) : null}
                    <div className="cmd-approval-grid">
                      <div>
                        <span>Reach</span>
                        {row.reach ?? "—"}
                      </div>
                      <div>
                        <span>Reversible</span>
                        {row.reversible ? "Yes" : "No"}
                      </div>
                      <div>
                        <span>Expires</span>
                        {row.expiresAt.toLocaleString("en-GB")}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="cmd-panel">
            <div className="cmd-panel-head">
              <div className="cmd-panel-title">Today&apos;s calls</div>
              <div className="cmd-panel-sub">Dubai time</div>
            </div>
            <div className="cmd-panel-body">
              {data.calls.length === 0 ? (
                <div className="cmd-list-sub">No calls scheduled today.</div>
              ) : (
                data.calls.map((call) => (
                  <div className="cmd-list-row" key={call.id}>
                    <div className="cmd-list-icon">
                      <AdminIcons name="clock" />
                    </div>
                    <div>
                      <div className="cmd-list-title">
                        {call.scheduledAt.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Dubai",
                        })}{" "}
                        · {call.eventType ?? "Call"} —{" "}
                        {call.inviteeName ?? call.inviteeEmail ?? "Invitee"}
                      </div>
                      <div className="cmd-list-sub">
                        {call.setter ? `Setter ${call.setter}` : "Calendly"} ·{" "}
                        {call.outcome}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="cmd-panel">
            <div className="cmd-panel-head">
              <div className="cmd-panel-title">Revenue by line, 7 days</div>
            </div>
            <div className="cmd-panel-body">
              <div className="cmd-divider" />
              <div className="cmd-kpi-mini">
                <span className="l">Supplements</span>
                <span className="v">
                  {formatGbp(data.byLine.supplements ?? 0)}
                </span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">Coaching</span>
                <span className="v">{formatGbp(data.byLine.coaching ?? 0)}</span>
              </div>
              <div className="cmd-kpi-mini">
                <span className="l">Training</span>
                <span className="v">{formatGbp(data.byLine.training ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
