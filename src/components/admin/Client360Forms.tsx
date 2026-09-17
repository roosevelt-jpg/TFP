"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addClientNoteAction,
  assignClientStaffAction,
  logClientSessionAction,
  unassignClientStaffAction,
  updateClientProfileAction,
  uploadClientImageAction,
} from "@/actions/admin/clients.action";
import {
  CLIENT_SESSION_STATUSES,
  CLIENT_SESSION_TYPES,
  CLIENT_STAFF_ROLES,
  STAFF_ASSIGN_OPTIONS,
} from "@/lib/admin/client-constants";

type Props = {
  personId: string;
  name: string;
  phone: string | null;
  country: string | null;
  timezone: string | null;
  dateOfBirth: string | null;
  bioSummary: string | null;
  igHandle: string | null;
  image: string | null;
  assignments: {
    id: string;
    staffPersonKey: string;
    staffName: string;
    role: string;
    assignedAt: string;
  }[];
};

export function Client360Forms(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(props.image);

  function refresh(okMessage: string) {
    setMsg(okMessage);
    setErr(null);
    router.refresh();
  }

  function fail(message: string) {
    setErr(message);
    setMsg(null);
  }

  async function onImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("imageFile");
    if (!(file instanceof File) || file.size === 0) {
      fail("Choose an image");
      return;
    }
    startTransition(async () => {
      const dataBase64 = await fileToBase64(file);
      const res = await uploadClientImageAction({
        personId: props.personId,
        dataBase64,
        contentType: file.type || "image/jpeg",
      });
      if (res?.serverError || res?.validationErrors) {
        fail(res.serverError ?? "Upload failed");
        return;
      }
      if (res?.data?.image) setPreview(res.data.image);
      refresh("Profile image saved");
    });
  }

  async function onProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await updateClientProfileAction({
        personId: props.personId,
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? "") || null,
        country: String(form.get("country") ?? "") || null,
        timezone: String(form.get("timezone") ?? "") || null,
        dateOfBirth: String(form.get("dateOfBirth") ?? "") || null,
        bioSummary: String(form.get("bioSummary") ?? "") || null,
        igHandle: String(form.get("igHandle") ?? "") || null,
      });
      if (res?.serverError || res?.validationErrors) {
        fail(res.serverError ?? "Could not save profile");
        return;
      }
      refresh("Profile details saved");
    });
  }

  async function onAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await assignClientStaffAction({
        personId: props.personId,
        staffPersonKey: String(form.get("staffPersonKey") ?? ""),
        role: String(form.get("role") ?? "coach") as
          | "coach"
          | "cs"
          | "setter"
          | "am"
          | "fulfilment",
        notes: String(form.get("notes") ?? "") || undefined,
      });
      if (res?.serverError || res?.validationErrors) {
        fail(res.serverError ?? "Could not assign staff");
        return;
      }
      event.currentTarget.reset();
      refresh("Staff assigned");
    });
  }

  async function onNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await addClientNoteAction({
        personId: props.personId,
        body: String(form.get("body") ?? ""),
        pinned: form.get("pinned") === "on",
      });
      if (res?.serverError || res?.validationErrors) {
        fail(res.serverError ?? "Could not add note");
        return;
      }
      event.currentTarget.reset();
      refresh("Note added");
    });
  }

  async function onSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const durationRaw = String(form.get("durationMin") ?? "").trim();
    startTransition(async () => {
      const res = await logClientSessionAction({
        personId: props.personId,
        title: String(form.get("title") ?? ""),
        type: String(form.get("type") ?? "coaching_call") as
          | "coaching_call"
          | "checkin"
          | "assessment"
          | "training"
          | "onboarding"
          | "other",
        status: String(form.get("status") ?? "completed") as
          | "scheduled"
          | "completed"
          | "no_show"
          | "cancelled",
        scheduledAt: String(form.get("scheduledAt") ?? ""),
        durationMin: durationRaw ? Number(durationRaw) : undefined,
        staffPersonKey: String(form.get("staffPersonKey") ?? "") || undefined,
        notes: String(form.get("notes") ?? "") || undefined,
      });
      if (res?.serverError || res?.validationErrors) {
        fail(res.serverError ?? "Could not log session");
        return;
      }
      event.currentTarget.reset();
      refresh("Session logged");
    });
  }

  return (
    <div className="cmd-client-forms">
      {(msg || err) && (
        <div className={`cmd-flash ${err ? "err" : "ok"}`}>{err ?? msg}</div>
      )}

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Profile image</div>
          </div>
          <div className="cmd-panel-body">
            <form onSubmit={onImage} className="cmd-form-stack">
              <div className="cmd-client-avatar-row">
                <div className="cmd-avatar cmd-avatar-lg">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" />
                  ) : (
                    <span>{initials(props.name)}</span>
                  )}
                </div>
                <div>
                  <label htmlFor="imageFile">Upload photo</label>
                  <input
                    id="imageFile"
                    name="imageFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="cmd-btn" disabled={pending}>
                Save image
              </button>
            </form>
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Basic + biographic</div>
          </div>
          <div className="cmd-panel-body">
            <form onSubmit={onProfile} className="cmd-form-stack">
              <label>
                Name
                <input name="name" defaultValue={props.name} required />
              </label>
              <label>
                Phone / WhatsApp
                <input name="phone" defaultValue={props.phone ?? ""} />
              </label>
              <label>
                Instagram handle
                <input name="igHandle" defaultValue={props.igHandle ?? ""} />
              </label>
              <label>
                Country
                <input name="country" defaultValue={props.country ?? ""} />
              </label>
              <label>
                Timezone
                <input name="timezone" defaultValue={props.timezone ?? ""} />
              </label>
              <label>
                Date of birth
                <input
                  name="dateOfBirth"
                  type="date"
                  defaultValue={props.dateOfBirth ?? ""}
                />
              </label>
              <label>
                Biography / context
                <textarea
                  name="bioSummary"
                  rows={4}
                  defaultValue={props.bioSummary ?? ""}
                />
              </label>
              <button type="submit" className="cmd-btn" disabled={pending}>
                Save details
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Assigned staff</div>
          </div>
          <div className="cmd-panel-body">
            {props.assignments.length === 0 ? (
              <div className="cmd-list-sub">No staff assigned yet</div>
            ) : (
              props.assignments.map((a) => (
                <div className="cmd-list-row" key={a.id}>
                  <div>
                    <div className="cmd-list-title">
                      {a.staffName} · {a.role}
                    </div>
                    <div className="cmd-list-sub">
                      since {new Date(a.assignedAt).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cmd-btn ghost"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await unassignClientStaffAction({
                          assignmentId: a.id,
                        });
                        if (res?.serverError) {
                          fail(res.serverError);
                          return;
                        }
                        refresh("Staff unassigned");
                      });
                    }}
                  >
                    End
                  </button>
                </div>
              ))
            )}
            <form onSubmit={onAssign} className="cmd-form-stack" style={{ marginTop: 12 }}>
              <label>
                Staff
                <select name="staffPersonKey" required defaultValue="lemoni">
                  {STAFF_ASSIGN_OPTIONS.map((s) => (
                    <option key={s.personKey} value={s.personKey}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Role
                <select name="role" required defaultValue="coach">
                  {CLIENT_STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <input name="notes" placeholder="Optional" />
              </label>
              <button type="submit" className="cmd-btn" disabled={pending}>
                Assign
              </button>
            </form>
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Log session</div>
          </div>
          <div className="cmd-panel-body">
            <form onSubmit={onSession} className="cmd-form-stack">
              <label>
                Title
                <input name="title" required placeholder="Week 3 check-in" />
              </label>
              <label>
                Type
                <select name="type" defaultValue="coaching_call">
                  {CLIENT_SESSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select name="status" defaultValue="completed">
                  {CLIENT_SESSION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                When
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  required
                  defaultValue={toLocalInput(new Date())}
                />
              </label>
              <label>
                Duration (min)
                <input name="durationMin" type="number" min={1} max={600} />
              </label>
              <label>
                Staff
                <select name="staffPersonKey" defaultValue="">
                  <option value="">—</option>
                  {STAFF_ASSIGN_OPTIONS.map((s) => (
                    <option key={s.personKey} value={s.personKey}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <textarea name="notes" rows={2} />
              </label>
              <button type="submit" className="cmd-btn" disabled={pending}>
                Log session
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">Add note</div>
        </div>
        <div className="cmd-panel-body">
          <form onSubmit={onNote} className="cmd-form-stack">
            <label>
              Note
              <textarea name="body" rows={3} required />
            </label>
            <label className="cmd-check-row">
              <input type="checkbox" name="pinned" /> Pin note
            </label>
            <button type="submit" className="cmd-btn" disabled={pending}>
              Save note
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}
