"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

type Props = {
  name: string;
  email: string;
  image: string | null;
};

export function AccountSettingsForm({ name, email, image }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(image);

  async function onProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    const form = new FormData(event.currentTarget);
    const nextName = String(form.get("name") ?? "").trim();
    const imageUrl = String(form.get("imageUrl") ?? "").trim();
    const file = form.get("imageFile");

    startTransition(async () => {
      let imageValue: string | undefined = imageUrl || undefined;

      if (file instanceof File && file.size > 0) {
        if (file.size > 1_500_000) {
          setProfileErr("Image must be under 1.5MB");
          return;
        }
        if (!file.type.startsWith("image/")) {
          setProfileErr("Choose an image file");
          return;
        }
        imageValue = await fileToDataUrl(file);
      }

      const result = await authClient.updateUser({
        name: nextName,
        ...(imageValue !== undefined ? { image: imageValue || null } : {}),
      });

      if (result.error) {
        setProfileErr(result.error.message ?? "Could not update profile");
        return;
      }
      if (imageValue) setPreview(imageValue);
      setProfileMsg("Profile saved");
      router.refresh();
    });
  }

  async function onPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordErr(null);
    setPasswordMsg(null);
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 12) {
      setPasswordErr("New password must be at least 12 characters");
      return;
    }
    if (newPassword !== confirm) {
      setPasswordErr("New passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setPasswordErr(result.error.message ?? "Could not change password");
        return;
      }
      setPasswordMsg("Password updated — other sessions signed out");
      event.currentTarget.reset();
    });
  }

  return (
    <div className="cmd-two-col">
      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title">Your profile</div>
            <div className="cmd-panel-sub">{email}</div>
          </div>
        </div>
        <div className="cmd-panel-body">
          <form onSubmit={onProfile}>
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div className="cmd-avatar cmd-avatar-lg">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" />
                ) : (
                  initialsFrom(name)
                )}
              </div>
              <div className="cell-muted" style={{ fontSize: 12 }}>
                Upload a square photo or paste an image URL. Saved to your
                account.
              </div>
            </div>
            <div className="cmd-field">
              <label htmlFor="name">Display name</label>
              <input id="name" name="name" defaultValue={name} required />
            </div>
            <div className="cmd-field">
              <label htmlFor="imageFile">Profile image</label>
              <input
                id="imageFile"
                name="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  void fileToDataUrl(f).then(setPreview);
                }}
              />
            </div>
            <div className="cmd-field">
              <label htmlFor="imageUrl">Or image URL</label>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://…"
                defaultValue={image?.startsWith("http") ? image : ""}
              />
            </div>
            {profileErr ? <div className="cmd-error">{profileErr}</div> : null}
            {profileMsg ? (
              <div className="cmd-success" style={{ marginBottom: 10 }}>
                {profileMsg}
              </div>
            ) : null}
            <button
              className="cmd-btn cmd-btn-primary"
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title">Password</div>
            <div className="cmd-panel-sub">
              Change or reset your password (requires current password)
            </div>
          </div>
        </div>
        <div className="cmd-panel-body">
          <form onSubmit={onPassword}>
            <div className="cmd-field">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="cmd-field">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </div>
            <div className="cmd-field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </div>
            {passwordErr ? <div className="cmd-error">{passwordErr}</div> : null}
            {passwordMsg ? (
              <div className="cmd-success" style={{ marginBottom: 10 }}>
                {passwordMsg}
              </div>
            ) : null}
            <button
              className="cmd-btn cmd-btn-primary"
              type="submit"
              disabled={pending}
            >
              {pending ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function initialsFrom(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
