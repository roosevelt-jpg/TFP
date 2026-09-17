"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { uploadEmailLogoAction } from "@/actions/admin/email-logo.action";

type Props = {
  status: {
    configured: boolean;
    source: "blob" | "local" | "missing";
    bytes: number | null;
  };
};

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

export function EmailLogoUploadForm({ status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;
    const file = (
      form.elements.namedItem("logo") as HTMLInputElement | null
    )?.files?.[0];
    if (!file) {
      setError("Choose a PNG of the Performance logo");
      return;
    }

    startTransition(async () => {
      try {
        const dataBase64 = await fileToBase64(file);
        const res = await uploadEmailLogoAction({
          dataBase64,
          contentType: file.type || "image/png",
          fileName: file.name,
        });
        if (res?.serverError || res?.validationErrors) {
          setError(res.serverError ?? "Upload failed");
          return;
        }
        setMessage(
          `Logo uploaded (${Math.round((res?.data?.bytes ?? 0) / 1024)} KB) — embedded in every email`,
        );
        form.reset();
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Upload failed");
      }
    });
  }

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-panel-title">Email branding</div>
          <div className="cmd-panel-sub">
            Upload the black Performance logo PNG. It is stored in Blob and
            attached inline to every outbound email — not a public URL.
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

        <div className="cell-muted" style={{ fontSize: 12, marginBottom: 12 }}>
          {status.configured
            ? `Current logo · ${status.source}${
                status.bytes != null
                  ? ` · ${Math.round(status.bytes / 1024)} KB`
                  : ""
              }`
            : "No logo uploaded yet"}
        </div>

        <form className="cmd-cred-row" onSubmit={onSubmit}>
          <div className="cmd-cred-meta">
            <label htmlFor="email-logo-file">Performance logo</label>
            <div className="cmd-mono" style={{ fontSize: 10 }}>
              PNG · light-email backgrounds · max 2MB
            </div>
          </div>
          <div className="cmd-cred-inputs">
            <input
              id="email-logo-file"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
            />
            <button
              className="cmd-btn cmd-btn-primary cmd-btn-sm"
              type="submit"
              disabled={pending}
            >
              {pending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
