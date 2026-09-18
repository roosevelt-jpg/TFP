"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createIntegrationsVaultPasscodeAction,
  lockIntegrationsVaultAction,
  resetIntegrationsVaultPasscodeAction,
  unlockIntegrationsVaultAction,
} from "@/actions/admin/integrations-vault.action";
import { IntegrationCredentialsForm } from "@/components/admin/IntegrationCredentialsForm";
import { EmailLogoUploadForm } from "@/components/admin/EmailLogoUploadForm";
import type { CredentialGroup } from "@/lib/secrets/catalog";
import type { SecretStatus } from "@/lib/secrets/store";

type LogoStatus = {
  configured: boolean;
  source: "blob" | "local" | "missing";
  bytes: number | null;
};

type Props = {
  passcodeConfigured: boolean;
  unlocked: boolean;
  groups: CredentialGroup[];
  statuses: SecretStatus[];
  logoStatus: LogoStatus;
};

export function IntegrationsVaultGate({
  passcodeConfigured,
  unlocked,
  groups,
  statuses,
  logoStatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await unlockIntegrationsVaultAction({
        passcode: String(fd.get("passcode") ?? ""),
      });
      if (res?.data && "ok" in res.data && !res.data.ok) {
        setError(res.data.error);
        return;
      }
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      router.refresh();
    });
  }

  function createPasscode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await createIntegrationsVaultPasscodeAction({
        passcode: String(fd.get("passcode") ?? ""),
        confirm: String(fd.get("confirm") ?? ""),
      });
      if (res?.data && "ok" in res.data && !res.data.ok) {
        setError(res.data.error);
        return;
      }
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      setMessage("Vault passcode created");
      router.refresh();
    });
  }

  function resetPasscode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await resetIntegrationsVaultPasscodeAction({
        currentPasscode: String(fd.get("currentPasscode") ?? ""),
        newPasscode: String(fd.get("newPasscode") ?? ""),
        confirm: String(fd.get("confirm") ?? ""),
      });
      if (res?.data && "ok" in res.data && !res.data.ok) {
        setError(res.data.error);
        return;
      }
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      setMessage("Vault passcode updated");
      setShowReset(false);
      router.refresh();
    });
  }

  function lock() {
    setError(null);
    startTransition(async () => {
      await lockIntegrationsVaultAction({});
      router.refresh();
    });
  }

  if (!passcodeConfigured) {
    return (
      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title">Create integrations passcode</div>
            <div className="cmd-panel-sub">
              Kane must set a vault passcode before credentials can be viewed or
              changed. Min 6 characters. Store it somewhere safe — you need the
              current code to reset it.
            </div>
          </div>
        </div>
        <div className="cmd-panel-body">
          {error ? <div className="cmd-error">{error}</div> : null}
          <form className="cmd-field" onSubmit={createPasscode}>
            <label htmlFor="vault-new">New passcode</label>
            <input
              id="vault-new"
              name="passcode"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <label htmlFor="vault-confirm">Confirm passcode</label>
            <input
              id="vault-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button
              className="cmd-btn cmd-btn-primary"
              type="submit"
              disabled={pending}
            >
              Set passcode & unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title">Integrations vault locked</div>
            <div className="cmd-panel-sub">
              Enter the vault passcode to view or edit API credentials. Unlock
              lasts 30 minutes.
            </div>
          </div>
        </div>
        <div className="cmd-panel-body">
          {error ? <div className="cmd-error">{error}</div> : null}
          <form className="cmd-field" onSubmit={unlock}>
            <label htmlFor="vault-unlock">Passcode</label>
            <input
              id="vault-unlock"
              name="passcode"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
            />
            <button
              className="cmd-btn cmd-btn-primary"
              type="submit"
              disabled={pending}
            >
              Unlock
            </button>
          </form>

          <button
            className="cmd-btn cmd-btn-sm"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => {
              setShowReset((v) => !v);
              setError(null);
            }}
          >
            {showReset ? "Hide reset" : "Reset passcode"}
          </button>

          {showReset ? (
            <form
              className="cmd-field"
              style={{ marginTop: 16 }}
              onSubmit={resetPasscode}
            >
              <div className="cmd-panel-title" style={{ fontSize: "0.95rem" }}>
                Reset vault passcode
              </div>
              <label htmlFor="vault-current">Current passcode</label>
              <input
                id="vault-current"
                name="currentPasscode"
                type="password"
                autoComplete="current-password"
                required
              />
              <label htmlFor="vault-reset-new">New passcode</label>
              <input
                id="vault-reset-new"
                name="newPasscode"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <label htmlFor="vault-reset-confirm">Confirm new passcode</label>
              <input
                id="vault-reset-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button
                className="cmd-btn cmd-btn-primary"
                type="submit"
                disabled={pending}
              >
                Save new passcode
              </button>
            </form>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cmd-panel" style={{ marginBottom: 16 }}>
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title">Vault unlocked</div>
            <div className="cmd-panel-sub">
              Credential edits are open for this session (30 min). Lock when
              finished.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="cmd-btn cmd-btn-sm"
              type="button"
              disabled={pending}
              onClick={() => {
                setShowReset((v) => !v);
                setError(null);
              }}
            >
              {showReset ? "Hide reset" : "Reset passcode"}
            </button>
            <button
              className="cmd-btn cmd-btn-sm cmd-btn-primary"
              type="button"
              disabled={pending}
              onClick={lock}
            >
              Lock vault
            </button>
          </div>
        </div>
        {message ? (
          <div className="cmd-panel-body">
            <div className="cmd-success">{message}</div>
          </div>
        ) : null}
        {error ? (
          <div className="cmd-panel-body">
            <div className="cmd-error">{error}</div>
          </div>
        ) : null}
        {showReset ? (
          <div className="cmd-panel-body">
            <form className="cmd-field" onSubmit={resetPasscode}>
              <label htmlFor="vault-u-current">Current passcode</label>
              <input
                id="vault-u-current"
                name="currentPasscode"
                type="password"
                required
              />
              <label htmlFor="vault-u-new">New passcode</label>
              <input
                id="vault-u-new"
                name="newPasscode"
                type="password"
                minLength={6}
                required
              />
              <label htmlFor="vault-u-confirm">Confirm new passcode</label>
              <input
                id="vault-u-confirm"
                name="confirm"
                type="password"
                minLength={6}
                required
              />
              <button
                className="cmd-btn cmd-btn-primary"
                type="submit"
                disabled={pending}
              >
                Save new passcode
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <EmailLogoUploadForm status={logoStatus} />
      <IntegrationCredentialsForm groups={groups} statuses={statuses} />
    </>
  );
}
