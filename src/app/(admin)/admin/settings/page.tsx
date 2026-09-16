import { AccountSettingsForm } from "@/components/admin/AccountSettingsForm";
import { ThresholdEditor } from "@/components/admin/ThresholdEditor";
import { PausePostingButton } from "@/components/admin/PausePostingButton";
import { AdminShell } from "@/components/admin/AdminShell";
import { db } from "@/db";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function SettingsPage() {
  const session = await requireAdminSession(["kane"]);
  const [thresholds, cms] = await Promise.all([
    db.alertThreshold.findMany({
      orderBy: { ruleId: "asc" },
    }),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="settings">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="settings.lead">
          {cms["settings.lead"] ??
            "Your account, roles, access rules, posting kill switch and editable alert thresholds."}
        </div>
      </div>

      <AccountSettingsForm
        name={session.user.name}
        email={session.user.email}
        image={session.user.image}
      />

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div
              className="cmd-panel-title"
              data-cms="settings.panel.killSwitch"
            >
              {cms["settings.panel.killSwitch"] ?? "Content kill switch"}
            </div>
            <div
              className="cmd-panel-sub"
              data-cms="settings.panel.killSwitchSub"
            >
              {cms["settings.panel.killSwitchSub"] ??
                "Stops every scheduled post within the next connector cycle"}
            </div>
          </div>
          <PausePostingButton />
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title" data-cms="settings.panel.roles">
            {cms["settings.panel.roles"] ?? "Roles"}
          </div>
        </div>
        <div className="cmd-panel-body">
          <div className="cmd-role-row">
            <div className="cell-strong">Kane</div>
            <div className="cell-muted">
              Full access — every page, every approval, finance, customer data
            </div>
            <div>
              <span className="cmd-badge cmd-badge-verified">Full</span>
            </div>
          </div>
          <div className="cmd-role-row">
            <div className="cell-strong">Leah</div>
            <div className="cell-muted">
              Money page, refunds up to £50, scorecard
            </div>
            <div>
              <span className="cmd-badge cmd-badge-calculated">Limited</span>
            </div>
          </div>
          <div className="cmd-role-row">
            <div className="cell-strong">Lemoni</div>
            <div className="cell-muted">
              Coaching pipeline, scorecard, calendar, CMS
            </div>
            <div>
              <span className="cmd-badge cmd-badge-calculated">Limited</span>
            </div>
          </div>
          <div className="cmd-role-row">
            <div className="cell-strong">Indigo</div>
            <div className="cell-muted">
              Systems health — no finance, no customer lists
            </div>
            <div>
              <span className="cmd-badge cmd-badge-calculated">Limited</span>
            </div>
          </div>
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div
              className="cmd-panel-title"
              data-cms="settings.panel.operatingRules"
            >
              {cms["settings.panel.operatingRules"] ?? "Operating rules"}
            </div>
          </div>
          <div className="cmd-panel-body">
            <div className="cmd-list-row">
              <div>
                <div className="cmd-list-title" data-cms="settings.rule1.title">
                  {cms["settings.rule1.title"] ??
                    "Reads are free. Writes stop."}
                </div>
                <div className="cmd-list-sub" data-cms="settings.rule1.sub">
                  {cms["settings.rule1.sub"] ??
                    "Nothing writes, sends, publishes, deletes, refunds or moves money without explicit approval."}
                </div>
              </div>
            </div>
            <div className="cmd-list-row">
              <div>
                <div className="cmd-list-title" data-cms="settings.rule2.title">
                  {cms["settings.rule2.title"] ??
                    "One approval authorises one action."}
                </div>
                <div className="cmd-list-sub" data-cms="settings.rule2.sub">
                  {cms["settings.rule2.sub"] ??
                    "No standing approvals. Silence is never approval."}
                </div>
              </div>
            </div>
            <div className="cmd-list-row">
              <div>
                <div className="cmd-list-title" data-cms="settings.rule3.title">
                  {cms["settings.rule3.title"] ??
                    "Subscriptions are no-touch."}
                </div>
                <div className="cmd-list-sub" data-cms="settings.rule3.sub">
                  {cms["settings.rule3.sub"] ??
                    "Kaching / Loop contracts: read-only mirror only."}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div
              className="cmd-panel-title"
              data-cms="settings.panel.thresholds"
            >
              {cms["settings.panel.thresholds"] ?? "Alert thresholds"}
            </div>
          </div>
          <div className="cmd-panel-body">
            <ThresholdEditor
              rows={thresholds.map((t) => ({
                id: t.id,
                ruleId: t.ruleId,
                label: t.label,
                value: t.value,
                unit: t.unit,
                enabled: t.enabled,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="cmd-footer-note" data-cms="settings.footer">
        {cms["settings.footer"] ??
          "TFP Command · /admin · build specification 15 Sep 2026"}
      </div>
    </AdminShell>
  );
}
