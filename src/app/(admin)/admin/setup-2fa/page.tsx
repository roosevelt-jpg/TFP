"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { commandBody, commandDisplay, commandMono } from "../../fonts";
import "../../admin.css";

const isLocalDev = process.env.NODE_ENV !== "production";

export default function Setup2faPage() {
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    startTransition(async () => {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        setError(result.error.message ?? "Could not enable 2FA");
        return;
      }
      setUri(
        result.data && "totpURI" in result.data
          ? result.data.totpURI
          : null,
      );
    });
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    startTransition(async () => {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(result.error.message ?? "Invalid code");
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <div
      className={`tfp-command cmd-auth-shell ${commandDisplay.variable} ${commandBody.variable} ${commandMono.variable}`}
      data-theme="dark"
    >
      <div className="cmd-auth-card">
        <div className="cmd-auth-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cmd-auth-logo"
            src="/logo.svg"
            alt="The Formula Programme"
          />
          <div className="cmd-brand-sub">TFP Command · Admin</div>
        </div>
        <h1>Set up 2FA</h1>
        <p>
          {isLocalDev
            ? "Optional in local development. Recommended before production."
            : "Mandatory before any Command page. Use an authenticator app."}
        </p>
        {error ? <div className="cmd-error">{error}</div> : null}
        {!uri ? (
          <form onSubmit={enable}>
            <div className="cmd-field">
              <label htmlFor="password">Confirm password</label>
              <input id="password" name="password" type="password" required />
            </div>
            <button className="cmd-btn cmd-btn-primary" disabled={pending} type="submit">
              Generate authenticator key
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <p className="cmd-mono" style={{ fontSize: 11, wordBreak: "break-all" }}>
              {uri}
            </p>
            <div className="cmd-field">
              <label htmlFor="code">Enter first code</label>
              <input id="code" name="code" inputMode="numeric" required />
            </div>
            <button className="cmd-btn cmd-btn-primary" disabled={pending} type="submit">
              Confirm and continue
            </button>
          </form>
        )}
        {isLocalDev ? (
          <button
            className="cmd-btn"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => {
              router.replace("/admin");
              router.refresh();
            }}
          >
            Skip for now (local only)
          </button>
        ) : null}
      </div>
    </div>
  );
}
