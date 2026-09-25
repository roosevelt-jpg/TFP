"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import {
  saveCmsFieldAction,
  uploadCmsMediaAction,
} from "@/actions/admin/cms.action";
import type { CmsFieldDef } from "@/lib/cms/landing-catalog";
import {
  plainTextJsonStrings,
  stripHtmlToPlainText,
} from "@/lib/cms/plain-text";

type FieldValue = {
  key: string;
  label: string;
  value: string;
  kind: CmsFieldDef["kind"];
  help?: string;
};

type Props = {
  groups: Array<[string, FieldValue[]]>;
};

function displayValue(field: FieldValue) {
  if (field.kind === "image" || field.kind === "toggle") return field.value;
  if (field.kind === "json") return plainTextJsonStrings(field.value);
  return stripHtmlToPlainText(field.value);
}

export function LandingCmsForm({ groups }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function saveText(key: string, value: string) {
    startTransition(async () => {
      await saveCmsFieldAction({ namespace: "landing", key, value });
      setMsg(`Saved ${key}`);
      router.refresh();
    });
  }

  async function saveImage(key: string, file: File) {
    startTransition(async () => {
      try {
        const blob = await upload(`cms/${Date.now()}-${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/cms/blob-upload",
          multipart: true,
          contentType: file.type || "image/png",
        });
        const res = await uploadCmsMediaAction({
          key,
          mediaUrl: blob.url,
          contentType: file.type || "image/png",
        });
        if (res?.data?.url) setMsg(`Uploaded ${key}`);
        else setMsg(res?.serverError ?? `Failed ${key}`);
        router.refresh();
      } catch (cause) {
        setMsg(cause instanceof Error ? cause.message : `Failed ${key}`);
      }
    });
  }

  return (
    <div className="cmd-cms">
      {msg ? <div className="cmd-flash ok">{msg}</div> : null}
      <div className="cmd-panel" style={{ marginBottom: 16 }}>
        <div className="cmd-panel-body">
          <p className="cmd-list-sub">
            Plain-text marketing CMS only — no HTML. Paste copy as normal text;
            tags are stripped on save. Images upload separately. API credentials
            live under <a href="/admin/integrations">Integrations</a>.
          </p>
        </div>
      </div>

      {groups.map(([group, fields]) => (
        <div className="cmd-panel" key={group} style={{ marginBottom: 16 }}>
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">{group}</div>
          </div>
          <div className="cmd-panel-body">
            {fields.map((field) => (
              <FieldEditor
                key={field.key}
                field={{ ...field, value: displayValue(field) }}
                pending={pending}
                onSaveText={saveText}
                onSaveImage={saveImage}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  pending,
  onSaveText,
  onSaveImage,
}: {
  field: FieldValue;
  pending: boolean;
  onSaveText: (key: string, value: string) => void;
  onSaveImage: (key: string, file: File) => void;
}) {
  if (field.kind === "image") {
    return (
      <div className="cmd-field">
        <label htmlFor={field.key}>{field.label}</label>
        {field.help ? <div className="cmd-list-sub">{field.help}</div> : null}
        {field.value ? (
          // biome-ignore lint/performance/noImgElement: admin preview of arbitrary CMS URLs
          <img
            src={field.value}
            alt=""
            style={{
              maxHeight: 72,
              marginBottom: 8,
              border: "1px solid var(--cmd-border)",
            }}
          />
        ) : null}
        <div className="cmd-list-sub" style={{ marginBottom: 6 }}>
          Current: {field.value || "(none)"}
        </div>
        <input
          id={field.key}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSaveImage(field.key, file);
          }}
        />
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const url = String(
              new FormData(event.currentTarget).get("url") ?? "",
            );
            onSaveText(field.key, url);
          }}
          style={{ marginTop: 8 }}
        >
          <input
            name="url"
            type="text"
            defaultValue={field.value}
            placeholder="Or paste image URL / path"
            autoComplete="off"
          />
          <button
            className="cmd-btn cmd-btn-sm cmd-btn-primary"
            disabled={pending}
            type="submit"
          >
            Save URL
          </button>
        </form>
      </div>
    );
  }

  if (field.kind === "toggle") {
    return (
      <form
        className="cmd-field"
        onSubmit={(event) => {
          event.preventDefault();
          const on = new FormData(event.currentTarget).get("on") === "on";
          onSaveText(field.key, on ? "true" : "false");
        }}
      >
        <label className="cmd-check-row">
          <input
            type="checkbox"
            name="on"
            defaultChecked={field.value === "true"}
          />
          {field.label}
        </label>
        {field.help ? <div className="cmd-list-sub">{field.help}</div> : null}
        <button
          className="cmd-btn cmd-btn-sm cmd-btn-primary"
          disabled={pending}
          type="submit"
        >
          Save
        </button>
      </form>
    );
  }

  if (field.kind === "text") {
    return (
      <form
        className="cmd-field"
        onSubmit={(event) => {
          event.preventDefault();
          const value = String(
            new FormData(event.currentTarget).get("value") ?? "",
          );
          onSaveText(field.key, value);
        }}
      >
        <label htmlFor={field.key}>{field.label}</label>
        {field.help ? <div className="cmd-list-sub">{field.help}</div> : null}
        <input
          id={field.key}
          name="value"
          type="text"
          defaultValue={field.value}
          autoComplete="off"
          spellCheck
        />
        <button
          className="cmd-btn cmd-btn-sm cmd-btn-primary"
          disabled={pending}
          type="submit"
        >
          Save
        </button>
      </form>
    );
  }

  const rows = field.kind === "json" ? 10 : 4;

  return (
    <form
      className="cmd-field"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget).get("value") ?? "",
        );
        onSaveText(field.key, value);
      }}
    >
      <label htmlFor={field.key}>{field.label}</label>
      {field.help ? <div className="cmd-list-sub">{field.help}</div> : null}
      <textarea
        id={field.key}
        name="value"
        defaultValue={field.value}
        rows={rows}
        spellCheck={field.kind !== "json"}
        style={
          field.kind === "json"
            ? { fontFamily: "var(--cmd-font-mono)" }
            : undefined
        }
      />
      <button
        className="cmd-btn cmd-btn-sm cmd-btn-primary"
        disabled={pending}
        type="submit"
      >
        Save
      </button>
    </form>
  );
}
