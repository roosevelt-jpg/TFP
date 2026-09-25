import { AccountSettingsForm } from "@/components/admin/AccountSettingsForm";
import { AutopilotSettingsForm } from "@/components/admin/AutopilotSettingsForm";
import { ThresholdEditor } from "@/components/admin/ThresholdEditor";
import { AlertTestFirePanel } from "@/components/admin/AlertTestFirePanel";
import { PausePostingButton } from "@/components/admin/PausePostingButton";
import { StaffAccessPanel } from "@/components/admin/StaffAccessPanel";
import { AdminShell } from "@/components/admin/AdminShell";
import { db } from "@/db";
import { listOpenInvites, listStaffUsers } from "@/lib/admin/invites";
import { ensureAlertThresholds } from "@/lib/alerts/ensure-thresholds";
import {
  ALERT_RULE_SEVERITIES,
  DEFAULT_ALERT_THRESHOLDS,
  listAlertRuleIds,
} from "@/lib/alerts/rules-config";
import { approvalModeEligibility } from "@/lib/content/approval-mode";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function SettingsPage() {
  const session = await requireAdminSession(["kane"]);
  await ensureAlertThresholds();
  const [thresholds, cms, users, invites, channels] = await Promise.all([
    db.alertThreshold.findMany({
      orderBy: { ruleId: "asc" },
    }),
    getCmsMap("admin"),
    listStaffUsers(),
    listOpenInvites(),
    db.channel.findMany({ orderBy: [{ platform: "asc" }, { account: "asc" }] }),
  ]);

  const autopilotRows = await Promise.all(
    channels.map(async (ch) => {
      const el = await approvalModeEligibility(ch.platform, ch.account);
      return {
        id: ch.id,
        platform: ch.platform,
        account: ch.account,
        approvalMode: el.approvalMode,
        eligible: el.eligible,
        daysOnEveryPost: el.stats.daysOnEveryPost,
        firstPassComplianceRate: el.stats.firstPassComplianceRate,
        rejectedCount: el.stats.rejectedCount,
      };
    }),
  );

  return (
    <AdminShell titleKey="settings">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="settings.lead">
          {cms["settings.lead"] ??
            "Your account, team invites, roles, posting kill switch and editable alert thresholds."}
        </div>
      </div>

      <AccountSettingsForm
        name={session.user.name}
        email={session.user.email}
        image={session.user.image}
      />

      <StaffAccessPanel
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          updatedAt: u.updatedAt.toISOString(),
          twoFactorEnabled: u.twoFactorEnabled,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
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
          <div>
            <div
              className="cmd-panel-title"
              data-cms="settings.panel.approvalMode"
            >
              {cms["settings.panel.approvalMode"] ?? "Content approval mode"}
            </div>
            <div
              className="cmd-panel-sub"
              data-cms="settings.panel.approvalModeSub"
            >
              {cms["settings.panel.approvalModeSub"] ??
                "Kane-only. Default every_post. Autopilot never turns on by itself."}
            </div>
          </div>
        </div>
        <AutopilotSettingsForm channels={autopilotRows} />
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

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div
              className="cmd-panel-title"
              data-cms="settings.panel.alertTestFire"
            >
              {cms["settings.panel.alertTestFire"] ?? "Alert test fire"}
            </div>
            <div
              className="cmd-panel-sub"
              data-cms="settings.panel.alertTestFireSub"
            >
              {cms["settings.panel.alertTestFireSub"] ??
                "Kane-only: create a TEST FIRE alert for each rule id."}
            </div>
          </div>
        </div>
        <AlertTestFirePanel
          rules={listAlertRuleIds().map((ruleId) => ({
            ruleId,
            severity: ALERT_RULE_SEVERITIES[ruleId] ?? "p2",
            label: DEFAULT_ALERT_THRESHOLDS[ruleId]?.label,
          }))}
        />
      </div>
      <div className="cmd-footer-note" data-cms="settings.footer">
        {cms["settings.footer"] ??
          "TFP Command · /admin · build specification 15 Sep 2026"}
      </div>
    </AdminShell>
  );
}
