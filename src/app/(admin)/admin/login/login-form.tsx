"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { authClient } from "@/lib/auth/client";
import { commandBody, commandDisplay, commandMono } from "../../fonts";
import "../../admin.css";

export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(
    params.get("error") === "role" ? "Your account has no admin access." : null,
  );
  const [pending, startTransition] = useTransition();
  const [needs2fa, setNeeds2fa] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const totp = String(form.get("totp") ?? "");

    startTransition(async () => {
      if (needs2fa) {
        const verify = await authClient.twoFactor.verifyTotp({ code: totp });
        if (verify.error) {
          setError(verify.error.message ?? "Invalid 2FA code");
          return;
        }
        router.replace("/admin");
        router.refresh();
        return;
      }

      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        if (
          result.error.code === "TWO_FACTOR_REQUIRED" ||
          result.error.message?.toLowerCase().includes("two factor")
        ) {
          setNeeds2fa(true);
          return;
        }
        setError(result.error.message ?? "Sign-in failed");
        return;
      }

      if (
        (result.data as { twoFactorRedirect?: boolean } | undefined)
          ?.twoFactorRedirect
      ) {
        setNeeds2fa(true);
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
      <form className="cmd-auth-card" onSubmit={onSubmit}>
        <div className="cmd-auth-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cmd-auth-logo"
            src="/logo.svg"
            alt="The Formula Programme"
          />
          <div className="cmd-brand-sub">TFP Command · Admin</div>
        </div>
        <h1>Sign in</h1>
        <p>
          {needs2fa
            ? "Enter the code from your authenticator app."
            : "Email and password. Invite-only staff accounts."}
        </p>
        {error ? <div className="cmd-error">{error}</div> : null}
        {!needs2fa ? (
          <>
            <div className="cmd-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </div>
            <div className="cmd-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
          </>
        ) : (
          <div className="cmd-field">
            <label htmlFor="totp">Authenticator code</label>
            <input
              id="totp"
              name="totp"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoComplete="one-time-code"
            />
          </div>
        )}
        <button
          className="cmd-btn cmd-btn-primary"
          type="submit"
          disabled={pending}
        >
          {pending ? "Signing in…" : needs2fa ? "Verify 2FA" : "Continue"}
        </button>
      </form>
    </div>
  );
}
