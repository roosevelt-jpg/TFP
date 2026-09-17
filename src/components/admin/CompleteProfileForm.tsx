"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { completeStaffProfileAction } from "@/actions/admin/staff.action";
import { commandBody, commandDisplay, commandMono } from "@/app/(admin)/fonts";
import "@/app/(admin)/admin.css";

type Props = {
  email: string;
  defaultName: string;
};

export function CompleteProfileForm({ email, defaultName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await completeStaffProfileAction({
        fullName: String(form.get("fullName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        whatsapp: String(form.get("whatsapp") ?? ""),
        jobTitle: String(form.get("jobTitle") ?? ""),
        timezone: String(form.get("timezone") ?? "Asia/Dubai"),
      });
      if (res?.serverError || res?.validationErrors) {
        setError(res.serverError ?? "Could not save profile");
        return;
      }
      router.replace("/admin/me");
      router.refresh();
    });
  }

  return (
    <div
      className={`tfp-command cmd-auth-shell ${commandDisplay.variable} ${commandBody.variable} ${commandMono.variable}`}
      data-theme="dark"
    >
      <form className="cmd-auth-card cmd-auth-card-wide" onSubmit={onSubmit}>
        <h1>Finish your profile</h1>
        <p className="cmd-auth-lead">
          {email} — complete these details to open your dashboard.
        </p>
        {error ? <div className="cmd-error">{error}</div> : null}
        <label>
          Full name
          <input
            name="fullName"
            required
            defaultValue={defaultName}
            minLength={2}
          />
        </label>
        <label>
          Job title
          <input name="jobTitle" required minLength={2} />
        </label>
        <label>
          Phone
          <input name="phone" required minLength={7} type="tel" />
        </label>
        <label>
          WhatsApp
          <input name="whatsapp" type="tel" />
        </label>
        <label>
          Timezone
          <select name="timezone" defaultValue="Asia/Dubai">
            <option value="Asia/Dubai">Asia/Dubai</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Asia/Karachi">Asia/Karachi</option>
          </select>
        </label>
        <button className="cmd-btn cmd-btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Open my dashboard"}
        </button>
      </form>
    </div>
  );
}
