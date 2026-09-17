"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  clearIntegrationSecretAction,
  saveIntegrationSecretAction,
} from "@/actions/admin/credentials.action";
import type { CredentialGroup } from "@/lib/secrets/catalog";
import type { SecretStatus } from "@/lib/secrets/store";

type Props = {
  groups: CredentialGroup[];
  statuses: SecretStatus[];
};

export function IntegrationCredentialsForm({ groups, statuses }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statusByKey = new Map(statuses.map((s) => [s.key, s]));

  function saveField(key: string, value: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await saveIntegrationSecretAction({ key, value });
      if (res?.serverError || res?.validationErrors) {
        setError(res.serverError ?? "Could not save credential");
        return;
      }
      setMessage(`Saved ${key} (encrypted in Postgres)`);
      router.refresh();
    });
  }

  function clearField(key: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await clearIntegrationSecretAction({ key });
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      setMessage(`Cleared database secret for ${key}`);
      router.refresh();
    });
  }

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-panel-title">API credentials</div>
          <div className="cmd-panel-sub">
            Enter once — values are encrypted in Postgres (Supabase). After
            save they are hidden; only last 4 characters show. Env vars on
            Vercel still work as fallback.
          </div>
        </div>
      </div>
      <div className="cmd-panel-body">
        {message ? <div className="cmd-success" style={{ marginBottom: 12 }}>{message}</div> : null}
        {error ? <div className="cmd-error">{error}</div> : null}

        {groups.map((group) => (
          <div key={group.id} className="cmd-cred-group">
            <div className="cmd-cred-group-head">
              <div className="cell-strong">{group.name}</div>
              <div className="cell-muted">{group.description}</div>
            </div>
            {group.fields.map((field) => {
              const status = statusByKey.get(field.key);
              const configured = Boolean(status?.configured);
              return (
                <form
                  key={field.key}
                  className="cmd-cred-row"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const value = String(
                      new FormData(event.currentTarget).get("value") ?? "",
                    ).trim();
                    if (!value) {
                      setError("Enter a value to save");
                      return;
                    }
                    saveField(field.key, value);
                    event.currentTarget.reset();
                  }}
                >
                  <div className="cmd-cred-meta">
                    <label htmlFor={`cred-${field.key}`}>{field.label}</label>
                    <div className="cmd-mono" style={{ fontSize: 10 }}>
                      {field.key}
                    </div>
                    {configured ? (
                      <div className="cell-muted" style={{ fontSize: 11 }}>
                        Saved · {status?.source}
                        {status?.lastFour ? ` · ••••${status.lastFour}` : ""}
                        {status?.updatedAt
                          ? ` · ${new Date(status.updatedAt).toLocaleString("en-GB")}`
                          : ""}
                      </div>
                    ) : (
                      <div className="cell-muted" style={{ fontSize: 11 }}>
                        Not set
                      </div>
                    )}
                  </div>
                  <div className="cmd-cred-inputs">
                    <input
                      id={`cred-${field.key}`}
                      name="value"
                      type={field.secret ? "password" : "text"}
                      autoComplete="off"
                      placeholder={
                        configured
                          ? "Enter new value to replace"
                          : (field.placeholder ?? "Paste value")
                      }
                      required
                    />
                    <button
                      className="cmd-btn cmd-btn-primary cmd-btn-sm"
                      type="submit"
                      disabled={pending}
                    >
                      Save
                    </button>
                    {status?.source === "database" ? (
                      <button
                        className="cmd-btn cmd-btn-sm"
                        type="button"
                        disabled={pending}
                        onClick={() => clearField(field.key)}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </form>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
