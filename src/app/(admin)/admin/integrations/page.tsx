import { AdminShell } from "@/components/admin/AdminShell";
import { EmailLogoUploadForm } from "@/components/admin/EmailLogoUploadForm";
import { IntegrationCredentialsForm } from "@/components/admin/IntegrationCredentialsForm";
import { getIntegrationsPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { emailLogoStatus } from "@/lib/mail/logo";
import {
  ALL_CREDENTIAL_KEYS,
  CREDENTIAL_GROUPS,
} from "@/lib/secrets/catalog";
import { listSecretStatuses } from "@/lib/secrets/store";

export default async function IntegrationsPage() {
  const session = await requireAdminSession(["kane", "indigo"]);
  const [connectors, statuses, logoStatus] = await Promise.all([
    getIntegrationsPageData(),
    listSecretStatuses(ALL_CREDENTIAL_KEYS),
    emailLogoStatus(),
  ]);
  const canEdit = session.user.role === "kane";

  return (
    <AdminShell titleKey="integrations">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          <strong>{connectors.length}</strong> data sources in the warehouse
          registry.
        </div>
      </div>

      <div className="cmd-section-note">
        Credentials are entered here by Kane, encrypted in Postgres (your
        Supabase database), then hidden. Vercel env vars remain a valid
        fallback for deploy-time secrets. The Performance email logo is
        uploaded as a file (not a URL) and embedded in every send.
      </div>

      {canEdit ? (
        <>
          <EmailLogoUploadForm status={logoStatus} />
          <IntegrationCredentialsForm
            groups={[...CREDENTIAL_GROUPS]}
            statuses={statuses}
          />
        </>
      ) : (
        <div className="cmd-panel">
          <div className="cmd-panel-body">
            Only Kane can add or rotate integration credentials.
          </div>
        </div>
      )}

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">Data sources</div>
        </div>
        <div className="cmd-panel-body">
          <div className="cmd-int-grid">
            {connectors.map((c) => (
              <div className="cmd-integration-card" key={c.id}>
                <div className="cmd-int-top">
                  <div>
                    <div className="cmd-int-name">{c.name}</div>
                    <div className="cmd-int-id">{c.sourceId}</div>
                  </div>
                  <span
                    className={`cmd-badge ${c.writeGated ? "cmd-badge-calculated" : "cmd-badge-verified"}`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="cmd-int-desc">
                  {c.scheduleNote ?? "Warehouse mirror"}
                </div>
                <div className="cmd-int-meta">
                  <span>
                    {c.lastSuccessAt
                      ? `Last ok ${c.lastSuccessAt.toLocaleString("en-GB")}`
                      : "Not run yet"}
                  </span>
                  <span>{c.writeGated ? "Write gated" : "Read-only"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
