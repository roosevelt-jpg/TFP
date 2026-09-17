"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  inviteStaffAction,
  removeStaffAccessAction,
  revokeStaffInviteAction,
  updateStaffRoleAction,
} from "@/actions/admin/staff.action";
import { INVITEABLE_ROLES } from "@/lib/admin/staff";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  updatedAt: string;
  twoFactorEnabled: boolean;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

type Props = {
  users: UserRow[];
  invites: InviteRow[];
};

export function StaffAccessPanel({ users, invites }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    // Capture before the async transition — currentTarget is null afterwards.
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    startTransition(async () => {
      const res = await inviteStaffAction({
        email: String(form.get("email") ?? ""),
        role: String(form.get("role") ?? "viewer") as
          | "leah"
          | "lemoni"
          | "indigo"
          | "asim"
          | "viewer",
      });
      if (res?.serverError || res?.validationErrors) {
        setError(res.serverError ?? "Could not send invite");
        return;
      }
      const invite = res?.data?.invite as
        | {
            emailSent?: boolean;
            acceptUrl?: string;
            email?: string;
            restored?: boolean;
          }
        | undefined;
      if (invite?.restored) {
        setMessage(
          `Restored access for ${invite.email} — they can sign in with their existing password.`,
        );
      } else if (invite && !invite.emailSent && invite.acceptUrl) {
        setMessage(
          `Invite created for ${invite.email}. Email not sent — copy link: ${invite.acceptUrl}`,
        );
      } else {
        setMessage(`Invite sent to ${String(form.get("email"))}`);
      }
      formEl.reset();
      router.refresh();
    });
  }

  function changeRole(userId: string, role: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await updateStaffRoleAction({
        userId,
        role: role as
          | "kane"
          | "leah"
          | "lemoni"
          | "indigo"
          | "asim"
          | "viewer",
      });
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      setMessage("Role updated");
      router.refresh();
    });
  }

  function removeAccess(userId: string, name: string) {
    if (
      !window.confirm(
        `Remove Command access for ${name}? They stay in the list as viewer and can be restored anytime.`,
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await removeStaffAccessAction({ userId });
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      setMessage(`Removed access for ${name}`);
      router.refresh();
    });
  }

  function revokeInvite(inviteId: string, email: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await revokeStaffInviteAction({ inviteId });
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      setMessage(`Revoked invite for ${email}`);
      router.refresh();
    });
  }

  const active = users.filter((u) => u.role !== "viewer");
  const removed = users.filter((u) => u.role === "viewer");

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-panel-title">Team access</div>
          <div className="cmd-panel-sub">
            Kane can invite, change roles, remove access, and restore anyone at
            any time.
          </div>
        </div>
      </div>
      <div className="cmd-panel-body">
        {message ? (
          <div className="cmd-success" style={{ marginBottom: 12 }}>
            {message}
          </div>
        ) : null}
        {error ? <div className="cmd-error">{error}</div> : null}

        <form className="cmd-cred-row" onSubmit={invite}>
          <div className="cmd-cred-meta">
            <label htmlFor="invite-email">Add or restore by email</label>
          </div>
          <div className="cmd-cred-inputs">
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              autoComplete="off"
            />
            <select name="role" defaultValue="leah" aria-label="Role">
              {INVITEABLE_ROLES.filter((r) => r !== "viewer").map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              className="cmd-btn cmd-btn-primary cmd-btn-sm"
              type="submit"
              disabled={pending}
            >
              Invite / restore
            </button>
          </div>
        </form>

        {invites.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <div className="cell-strong" style={{ marginBottom: 8 }}>
              Open invites
            </div>
            {invites.map((invite) => (
              <div className="cmd-list-row" key={invite.id}>
                <div>
                  <div className="cmd-list-title">{invite.email}</div>
                  <div className="cmd-list-sub">
                    {invite.role} · expires{" "}
                    {new Date(invite.expiresAt).toLocaleString("en-GB")}
                  </div>
                </div>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm"
                  disabled={pending}
                  onClick={() => revokeInvite(invite.id, invite.email)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: 20 }}>
          <div className="cell-strong" style={{ marginBottom: 8 }}>
            Active accounts
          </div>
          {active.map((user) => (
            <div className="cmd-role-row" key={user.id}>
              <div>
                <div className="cell-strong">{user.name}</div>
                <div className="cell-muted">{user.email}</div>
              </div>
              <div className="cell-muted" style={{ fontSize: 11 }}>
                {user.twoFactorEnabled ? "2FA on" : "2FA off"} ·{" "}
                {new Date(user.updatedAt).toLocaleDateString("en-GB")}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {user.role === "kane" ? (
                  <span className="cmd-badge cmd-badge-verified">kane</span>
                ) : (
                  <>
                    <select
                      value={user.role}
                      disabled={pending}
                      aria-label={`Role for ${user.name}`}
                      onChange={(event) =>
                        changeRole(user.id, event.target.value)
                      }
                    >
                      {["leah", "lemoni", "indigo", "asim"].map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="cmd-btn cmd-btn-sm cmd-btn-danger"
                      disabled={pending}
                      onClick={() => removeAccess(user.id, user.name)}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {removed.length > 0 ? (
          <div style={{ marginTop: 20 }}>
            <div className="cell-strong" style={{ marginBottom: 8 }}>
              Removed (no access) — restore anytime
            </div>
            {removed.map((user) => (
              <div className="cmd-role-row" key={user.id}>
                <div>
                  <div className="cell-strong">{user.name}</div>
                  <div className="cell-muted">{user.email}</div>
                </div>
                <div className="cell-muted" style={{ fontSize: 11 }}>
                  viewer
                </div>
                <div>
                  <select
                    defaultValue=""
                    disabled={pending}
                    aria-label={`Restore ${user.name}`}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      changeRole(user.id, event.target.value);
                    }}
                  >
                    <option value="">Restore as…</option>
                    {["leah", "lemoni", "indigo", "asim"].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
