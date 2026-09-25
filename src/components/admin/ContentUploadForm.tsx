"use client";

import { upload } from "@vercel/blob/client";
import { useState, useTransition } from "react";

import { uploadContentAssetAction } from "@/actions/admin/content-upload.action";

/**
 * Always direct-to-Blob multipart — never base64 through the server action.
 */
export function ContentUploadForm() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div className="cmd-panel-title">Phone / creator upload</div>
      </div>
      <div className="cmd-panel-body">
        {note ? <div className="cmd-section-note">{note}</div> : null}
        {progress !== null ? (
          <div className="cmd-list-sub" style={{ marginBottom: 8 }}>
            Upload {Math.round(progress)}%
          </div>
        ) : null}
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
                let mediaContentType: string | undefined;
                let mediaFileName: string | undefined;
                let mediaUrl: string | undefined;
                let mediaByteSize: number | undefined;

                if (file) {
                  mediaContentType = file.type || undefined;
                  mediaFileName = file.name;
                  mediaByteSize = file.size;
                  setProgress(0);
                  const blob = await upload(
                    `content/${Date.now()}-${file.name}`,
                    file,
                    {
                      access: "public",
                      handleUploadUrl: "/api/admin/content/blob-upload",
                      multipart: true,
                      contentType: file.type || undefined,
                      onUploadProgress: (p) => setProgress(p.percentage),
                    },
                  );
                  mediaUrl = blob.url;
                  setProgress(null);
                }

                const creatorName = String(
                  formData.get("creatorName") ?? "",
                ).trim();
                const creatorEmail = String(
                  formData.get("creatorEmail") ?? "",
                ).trim();

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
                  creatorName: creatorName || undefined,
                  creatorEmail: creatorEmail || undefined,
                  creatorLicence: formData.get("licence") === "on",
                  publicConsent: formData.get("consent") === "on",
                  mediaContentType,
                  mediaFileName,
                  mediaUrl,
                  mediaByteSize,
                });
                setNote(
                  res?.data
                    ? `Saved ${res.data.id} · ${res.data.state}${
                        res.data.mediaUrl ? " · media uploaded" : ""
                      }${
                        "note" in (res.data ?? {}) && res.data?.note
                          ? ` · ${res.data.note}`
                          : ""
                      }`
                    : (res?.serverError ?? "Upload failed"),
                );
                if (res?.data && !("note" in res.data && res.data.note)) {
                  form.reset();
                }
              } catch (cause) {
                setProgress(null);
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
            <label htmlFor="creatorName">Creator name (affiliate register)</label>
            <input
              id="creatorName"
              name="creatorName"
              placeholder="Blank for Kane / own footage"
            />
          </div>
          <div className="cmd-field">
            <label htmlFor="creatorEmail">Creator email (optional)</label>
            <input id="creatorEmail" name="creatorEmail" type="email" />
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
              Direct multipart upload to Blob (images + 4K video up to 2GB).
              Requires BLOB_READ_WRITE_TOKEN.
            </div>
          </div>
          <label className="cmd-list-sub">
            <input name="licence" type="checkbox" defaultChecked /> Creator
            licence signed (Kane/own only — ignored when creator is on register)
          </label>
          <label className="cmd-list-sub" style={{ display: "block", marginTop: 8 }}>
            <input name="consent" type="checkbox" /> Public / on-camera consent
            recorded
          </label>
          <div className="cmd-list-sub" style={{ marginTop: 4 }}>
            Named creators: register must show a signed agreement. Consent always
            required before leaving TAGGED.
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
