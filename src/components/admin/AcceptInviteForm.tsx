"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acceptInviteAction } from "@/actions/admin/staff.action";
import { commandBody, commandDisplay, commandMono } from "@/app/(admin)/fonts";
import "@/app/(admin)/admin.css";

type Props = {
  token: string;
  emailHint?: string;
  roleHint?: string;
};

export function AcceptInviteForm({ token, emailHint, roleHint }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    startTransition(async () => {
      const res = await acceptInviteAction({
        token,
        fullName: String(form.get("fullName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        whatsapp: String(form.get("whatsapp") ?? ""),
        jobTitle: String(form.get("jobTitle") ?? ""),
        timezone: String(form.get("timezone") ?? "Asia/Dubai"),
        password,
      });
      if (res?.serverError || res?.validationErrors) {
        setError(res.serverError ?? "Could not create profile");
        return;
      }
      router.replace("/admin/login?invited=1");
      router.refresh();
    });
  }

  return (
    <div
      className={`tfp-command cmd-auth-shell ${commandDisplay.variable} ${commandBody.variable} ${commandMono.variable}`}
      data-theme="dark"
    >
      <form className="cmd-auth-card cmd-auth-card-wide" onSubmit={onSubmit}>
        <div className="cmd-auth-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cmd-auth-logo"
            src="/logo.svg"
            alt="The Formula Programme"
          />
          <div className="cmd-brand-sub">TFP Command · Create profile</div>
        </div>
        <h1>Create your profile</h1>
        <p className="cmd-auth-lead">
          {emailHint
            ? `Invited as ${roleHint ?? "staff"} · ${emailHint}. `
            : null}
          Fill every field to unlock your dashboard. You’ll get a Resend
          confirmation email when it’s ready.
        </p>
        {error ? <div className="cmd-error">{error}</div> : null}

        <label>
          Full name
          <input name="fullName" required minLength={2} autoComplete="name" />
        </label>
        <label>
          Job title
          <input
            name="jobTitle"
            required
            minLength={2}
            placeholder="e.g. Finance & customer service"
            autoComplete="organization-title"
          />
        </label>
        <label>
          Phone
          <input
            name="phone"
            required
            minLength={7}
            type="tel"
            autoComplete="tel"
            placeholder="+971…"
          />
        </label>
        <label>
          WhatsApp (if different)
          <input name="whatsapp" type="tel" placeholder="Same as phone if blank" />
        </label>
        <label>
          Timezone
          <select name="timezone" defaultValue="Asia/Dubai">
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Asia/Karachi">Asia/Karachi</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>
        <button
          className="cmd-btn cmd-btn-primary"
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating profile…" : "Create profile & unlock desk"}
        </button>
      </form>
    </div>
  );
}
