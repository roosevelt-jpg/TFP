import { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { IntegrationsVaultGate } from "@/components/admin/IntegrationsVaultGate";
import { getIntegrationsPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { emailLogoStatus } from "@/lib/mail/logo";
import {
  ALL_CREDENTIAL_KEYS,
  CREDENTIAL_GROUPS,
} from "@/lib/secrets/catalog";
import { listSecretStatuses } from "@/lib/secrets/store";
import {
  isVaultUnlocked,
  vaultPasscodeConfigured,
} from "@/lib/secrets/vault-passcode";

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="tfp-command" data-theme="dark">
          <div className="cmd-app">
            <div className="cmd-main" style={{ padding: 24 }}>
              Loading integrations…
            </div>
          </div>
        </div>
      }
    >
      <IntegrationsPageContent />
    </Suspense>
  );
}

async function IntegrationsPageContent() {
  const session = await requireAdminSession(["kane", "indigo"]);
  const [connectors, statuses, logoStatus, passcodeConfigured, unlocked] =
    await Promise.all([
      getIntegrationsPageData(),
      listSecretStatuses(ALL_CREDENTIAL_KEYS),
      emailLogoStatus(),
      vaultPasscodeConfigured(),
      isVaultUnlocked(session.user.id),
    ]);
  const canEdit = session.user.role === "kane";

  return (
    <AdminShell titleKey="integrations">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          <strong>{connectors.length}</strong> data sources in the warehouse
          registry. Credential edits require Kane’s vault passcode.
        </div>
      </div>

      <div className="cmd-section-note">
        Credentials are encrypted in Postgres after save. The vault passcode
        gates viewing and changing them — set it once, unlock when needed, reset
        with the current code.
      </div>

      {canEdit ? (
        <IntegrationsVaultGate
          passcodeConfigured={passcodeConfigured}
          unlocked={unlocked}
          groups={[...CREDENTIAL_GROUPS]}
          statuses={statuses}
          logoStatus={logoStatus}
        />
      ) : (
        <div className="cmd-panel">
          <div className="cmd-panel-body">
            Only Kane can unlock the vault and rotate integration credentials.
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
