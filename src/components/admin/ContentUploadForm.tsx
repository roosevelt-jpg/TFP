"use client";

import { useState, useTransition } from "react";

import { uploadContentAssetAction } from "@/actions/admin/content-upload.action";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

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
            const form = event.currentTarget;
            const formData = new FormData(form);
            const file = (
              form.elements.namedItem("media") as HTMLInputElement | null
            )?.files?.[0];

            startTransition(async () => {
              try {
                let mediaBase64: string | undefined;
                let mediaContentType: string | undefined;
                let mediaFileName: string | undefined;
                if (file) {
                  mediaBase64 = await fileToBase64(file);
                  mediaContentType = file.type || undefined;
                  mediaFileName = file.name;
                }

                const res = await uploadContentAssetAction({
                  title: String(formData.get("title") ?? ""),
                  uploader: String(formData.get("uploader") ?? ""),
                  caption: String(formData.get("caption") ?? ""),
                  platform: String(formData.get("platform") ?? "instagram") as
                    | "instagram"
                    | "tiktok"
                    | "youtube_shorts"
                    | "youtube",
                  account: String(formData.get("account") ?? ""),
                  creatorLicence: formData.get("licence") === "on",
                  publicConsent: formData.get("consent") === "on",
                  mediaBase64,
                  mediaContentType,
                  mediaFileName,
                });
                setNote(
                  res?.data
                    ? `Saved ${res.data.id} · ${res.data.state}${
                        res.data.mediaUrl ? " · media uploaded" : ""
                      }`
                    : (res?.serverError ?? "Upload failed"),
                );
                if (res?.data) form.reset();
              } catch (cause) {
                setNote(
                  cause instanceof Error ? cause.message : "Upload failed",
                );
              }
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
          <div className="cmd-field">
            <label htmlFor="media">Media (optional)</label>
            <input
              id="media"
              name="media"
              type="file"
              accept="image/*,video/*"
            />
            <div className="cmd-list-sub" style={{ marginTop: 4 }}>
              Image or video · max 32MB · stored on Blob
            </div>
          </div>
          <label className="cmd-list-sub">
            <input name="licence" type="checkbox" defaultChecked /> Creator
            licence signed
          </label>
          <label className="cmd-list-sub" style={{ display: "block", marginTop: 8 }}>
            <input name="consent" type="checkbox" /> Public / on-camera consent
            recorded
          </label>
          <div className="cmd-list-sub" style={{ marginTop: 4 }}>
            Both required before the card can leave TAGGED or be approved.
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              className="cmd-btn cmd-btn-primary"
              disabled={pending}
              type="submit"
            >
              {pending ? "Uploading…" : "Add to pipeline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
