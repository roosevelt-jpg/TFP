"use client";

import { useState, useTransition } from "react";

import { uploadContentAssetAction } from "@/actions/admin/content-upload.action";

export function ContentUploadForm() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div className="cmd-panel-title">Phone / creator upload</div>
      </div>
      <div className="cmd-panel-body">
        {note ? <div className="cmd-section-note">{note}</div> : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const res = await uploadContentAssetAction({
                title: String(form.get("title") ?? ""),
                uploader: String(form.get("uploader") ?? ""),
                caption: String(form.get("caption") ?? ""),
                platform: String(form.get("platform") ?? "instagram") as
                  | "instagram"
                  | "tiktok"
                  | "youtube_shorts"
                  | "youtube",
                account: String(form.get("account") ?? ""),
                creatorLicence: form.get("licence") === "on",
              });
              setNote(
                res?.data
                  ? `Saved ${res.data.id} · ${res.data.state}`
                  : (res?.serverError ?? "Upload failed"),
              );
            });
          }}
        >
          <div className="cmd-field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" required />
          </div>
          <div className="cmd-field">
            <label htmlFor="uploader">Uploader</label>
            <input id="uploader" name="uploader" required />
          </div>
          <div className="cmd-field">
            <label htmlFor="caption">Caption</label>
            <textarea id="caption" name="caption" rows={3} />
          </div>
          <div className="cmd-field">
            <label htmlFor="platform">Platform</label>
            <select id="platform" name="platform" defaultValue="instagram">
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube_shorts">YouTube Shorts</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div className="cmd-field">
            <label htmlFor="account">Account</label>
            <input
              id="account"
              name="account"
              defaultValue="@theformulaperformance"
              required
            />
          </div>
          <label className="cmd-list-sub">
            <input name="licence" type="checkbox" defaultChecked /> Creator
            licence signed
          </label>
          <div style={{ marginTop: 12 }}>
            <button
              className="cmd-btn cmd-btn-primary"
              disabled={pending}
              type="submit"
            >
              Add to pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
