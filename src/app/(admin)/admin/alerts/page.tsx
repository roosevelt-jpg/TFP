import { AlertsClient } from "@/components/admin/AlertsClient";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAlertsPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function AlertsPage() {
  await requireAdminSession([
    "kane",
    "leah",
    "lemoni",
    "indigo",
    "asim",
  ]);
  const [data, cms] = await Promise.all([
    getAlertsPageData(),
    getCmsMap("admin"),
  ]);
  const pendingApprovals = data.approvals.filter(
    (a) => a.status === "pending",
  ).length;

  return (
    <AdminShell titleKey="alerts">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="alerts.lead">
          {cms["alerts.lead"] ??
            `${data.open.length} open · ${pendingApprovals} approvals waiting.`}
        </div>
        <span className="cmd-freshness">Live</span>
      </div>
      <AlertsClient
        open={data.open.map((a) => ({
          id: a.id,
          ruleId: a.ruleId,
          severity: a.severity,
          title: a.title,
          status: a.status,
          firedAt: a.firedAt.toISOString(),
        }))}
        approvals={data.approvals.map((a) => ({
          id: a.id,
          action: a.action,
          status: a.status,
          reach: a.reach,
          reversible: a.reversible,
          specialistVerdict: a.specialistVerdict,
          expiresAt: a.expiresAt.toISOString(),
        }))}
        log={data.log.map((a) => ({
          id: a.id,
          action: a.action,
          status: a.status,
          verificationResult: a.verificationResult,
          updatedAt: a.updatedAt.toISOString(),
        }))}
      />
    </AdminShell>
  );
}
