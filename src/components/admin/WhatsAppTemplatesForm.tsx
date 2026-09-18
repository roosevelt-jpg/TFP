"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createWhatsAppTemplateAction,
  deleteWhatsAppTemplateAction,
  saveWhatsAppTemplateAction,
} from "@/actions/admin/whatsapp-templates.action";
import { LanguageSelect } from "@/components/admin/LocaleSelects";
import { DEFAULT_LANGUAGE, coerceLanguageCode } from "@/lib/i18n/catalog";
import { WHATSAPP_TEMPLATE_KEYS } from "@/lib/whatsapp/templates-keys";

export type MetaTemplateRow = {
  key: string;
  channel: "whatsapp" | "instagram";
  label: string;
  description: string | null;
  metaName: string;
  language: string;
  bodyText: string | null;
  bodyVars: number;
  buttonUrlCount: number;
  headerMediaType: string;
  headerMediaUrl: string | null;
  category: string;
  triggerHint: string | null;
  enabled: boolean;
  version: number;
};

/** @deprecated use MetaTemplateRow */
export type WhatsAppTemplateRow = MetaTemplateRow;

const WIRED = new Set<string>([
  ...WHATSAPP_TEMPLATE_KEYS,
  "ig_inbound_ack",
  "ig_high_intent",
]);

function mediaTypeOf(
  value: string,
): "none" | "image" | "video" | "document" {
  if (value === "image" || value === "video" || value === "document") {
    return value;
  }
  return "none";
}

function categoryOf(
  value: string,
): "utility" | "lifecycle" | "marketing" | "authentication" {
  if (
    value === "lifecycle" ||
    value === "marketing" ||
    value === "authentication"
  ) {
    return value;
  }
  return "utility";
}

export function MetaTemplatesForm({
  channel,
  templates,
}: {
  channel: "whatsapp" | "instagram";
  templates: MetaTemplateRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const isIg = channel === "instagram";

  function readPayload(fd: FormData, key: string) {
    const metaName = String(fd.get("metaName") ?? "").trim() || key;
    return {
      channel,
      key,
      label: String(fd.get("label") ?? ""),
      description: String(fd.get("description") ?? "") || undefined,
      metaName,
      language: coerceLanguageCode(String(fd.get("language") ?? DEFAULT_LANGUAGE)),
      bodyText: String(fd.get("bodyText") ?? "") || undefined,
      bodyVars: Number(fd.get("bodyVars") ?? (isIg ? 0 : 1)),
      buttonUrlCount: Number(fd.get("buttonUrlCount") ?? 0),
      headerMediaType: mediaTypeOf(String(fd.get("headerMediaType") ?? "none")),
      headerMediaUrl: String(fd.get("headerMediaUrl") ?? "") || undefined,
      category: categoryOf(String(fd.get("category") ?? "utility")),
      triggerHint: String(fd.get("triggerHint") ?? "") || undefined,
      enabled: fd.get("enabled") === "on",
    };
  }

  function onSave(event: FormEvent<HTMLFormElement>, key: string) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      setErr(null);
      await saveWhatsAppTemplateAction(readPayload(fd, key));
      setMsg(`Saved ${key}`);
      router.refresh();
    });
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const key = String(fd.get("key") ?? "");
    startTransition(async () => {
      setErr(null);
      const res = await createWhatsAppTemplateAction(readPayload(fd, key));
      const data = res?.data;
      if (data && "ok" in data && data.ok === false) {
        setErr(data.error);
        return;
      }
      setMsg(`Created ${key}`);
      (event.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  function onDelete(key: string) {
    startTransition(async () => {
      setErr(null);
      const res = await deleteWhatsAppTemplateAction({ key });
      const data = res?.data;
      if (data && "ok" in data && data.ok === false) {
        setErr(data.error);
        return;
      }
      setMsg(`Deleted ${key}`);
      router.refresh();
    });
  }

  return (
    <div className="cmd-panel" style={{ marginBottom: 16 }}>
      <div className="cmd-panel-head">
        <div className="cmd-panel-title">
          {isIg ? "Instagram DM templates" : "WhatsApp Meta templates"}
        </div>
      </div>
      <div className="cmd-panel-body">
        <p className="cmd-list-sub" style={{ marginBottom: 16 }}>
          {isIg
            ? "Edit Instagram auto-reply copy and optional image/video attachments here. Same Meta app webhook as WhatsApp (/api/webhooks/meta)."
            : "Manage Cloud API template names (must match Business Manager). Optional header image/video URL for media templates. Sends to the CRM WhatsApp number on the customer/waitlist record."}
        </p>
        {msg ? <div className="cmd-flash ok">{msg}</div> : null}
        {err ? <div className="cmd-flash err">{err}</div> : null}

        {templates.map((t) => (
          <form
            key={t.key}
            className="cmd-field"
            style={{
              borderTop: "1px solid var(--cmd-border)",
              paddingTop: 14,
              marginTop: 14,
            }}
            onSubmit={(e) => onSave(e, t.key)}
          >
            <div className="cmd-panel-title" style={{ fontSize: "0.95rem" }}>
              {t.key}{" "}
              <span className="cmd-list-sub">
                v{t.version}
                {WIRED.has(t.key) ? " · wired trigger" : " · custom"}
              </span>
            </div>
            {t.triggerHint ? (
              <div className="cmd-list-sub">Trigger: {t.triggerHint}</div>
            ) : null}

            <label htmlFor={`${t.key}-label`}>Label</label>
            <input
              id={`${t.key}-label`}
              name="label"
              defaultValue={t.label}
              required
            />

            {!isIg ? (
              <>
                <label htmlFor={`${t.key}-meta`}>Meta template name</label>
                <input
                  id={`${t.key}-meta`}
                  name="metaName"
                  defaultValue={t.metaName}
                  required
                  placeholder="exact_name_from_meta"
                />
                <label htmlFor={`${t.key}-lang`}>Language</label>
                <LanguageSelect
                  id={`${t.key}-lang`}
                  name="language"
                  defaultValue={t.language}
                  required
                />
              </>
            ) : (
              <input type="hidden" name="metaName" value={t.metaName || t.key} />
            )}

            {isIg ? (
              <>
                <label htmlFor={`${t.key}-body`}>DM body</label>
                <textarea
                  id={`${t.key}-body`}
                  name="bodyText"
                  rows={4}
                  defaultValue={t.bodyText ?? ""}
                  placeholder="Use {{1}} for first name if needed"
                />
              </>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <label htmlFor={`${t.key}-vars`}>Body vars</label>
                <input
                  id={`${t.key}-vars`}
                  name="bodyVars"
                  type="number"
                  min={0}
                  max={5}
                  defaultValue={t.bodyVars}
                />
              </div>
              {!isIg ? (
                <div>
                  <label htmlFor={`${t.key}-btns`}>URL buttons</label>
                  <input
                    id={`${t.key}-btns`}
                    name="buttonUrlCount"
                    type="number"
                    min={0}
                    max={3}
                    defaultValue={t.buttonUrlCount}
                  />
                </div>
              ) : (
                <input type="hidden" name="buttonUrlCount" value={0} />
              )}
              <div>
                <label htmlFor={`${t.key}-cat`}>Category</label>
                <select
                  id={`${t.key}-cat`}
                  name="category"
                  defaultValue={t.category}
                >
                  <option value="utility">utility</option>
                  <option value="lifecycle">lifecycle</option>
                  <option value="marketing">marketing</option>
                  <option value="authentication">authentication</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: 10,
              }}
            >
              <div>
                <label htmlFor={`${t.key}-media-type`}>Media</label>
                <select
                  id={`${t.key}-media-type`}
                  name="headerMediaType"
                  defaultValue={t.headerMediaType || "none"}
                >
                  <option value="none">none</option>
                  <option value="image">image</option>
                  <option value="video">video</option>
                  <option value="document">document</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${t.key}-media-url`}>Media HTTPS URL</label>
                <input
                  id={`${t.key}-media-url`}
                  name="headerMediaUrl"
                  type="url"
                  defaultValue={t.headerMediaUrl ?? ""}
                  placeholder="https://… (public CDN / blob)"
                />
              </div>
            </div>

            <label htmlFor={`${t.key}-desc`}>Description</label>
            <textarea
              id={`${t.key}-desc`}
              name="description"
              rows={2}
              defaultValue={t.description ?? ""}
            />

            <label htmlFor={`${t.key}-hint`}>Trigger hint</label>
            <input
              id={`${t.key}-hint`}
              name="triggerHint"
              defaultValue={t.triggerHint ?? ""}
            />

            <label className="cmd-check-row">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={t.enabled}
              />
              Enabled
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="cmd-btn cmd-btn-sm cmd-btn-primary"
                disabled={pending}
                type="submit"
              >
                Save template
              </button>
              {!WIRED.has(t.key) ? (
                <button
                  className="cmd-btn cmd-btn-sm"
                  disabled={pending}
                  type="button"
                  onClick={() => onDelete(t.key)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </form>
        ))}

        <form
          className="cmd-field"
          style={{
            borderTop: "1px solid var(--cmd-border)",
            paddingTop: 14,
            marginTop: 20,
          }}
          onSubmit={onCreate}
        >
          <div className="cmd-panel-title" style={{ fontSize: "0.95rem" }}>
            Add {isIg ? "Instagram" : "WhatsApp"} template
          </div>

          <label htmlFor="new-key">App key</label>
          <input
            id="new-key"
            name="key"
            required
            placeholder={isIg ? "e.g. ig_offer_reply" : "e.g. shipping_update"}
            pattern="[A-Za-z0-9_]+"
          />

          <label htmlFor="new-label">Label</label>
          <input id="new-label" name="label" required />

          {!isIg ? (
            <>
              <label htmlFor="new-meta">Meta template name</label>
              <input
                id="new-meta"
                name="metaName"
                required
                pattern="[A-Za-z0-9_]+"
              />
              <label htmlFor="new-lang">Language</label>
              <LanguageSelect
                id="new-lang"
                name="language"
                defaultValue={DEFAULT_LANGUAGE}
                required
              />
            </>
          ) : (
            <>
              <input type="hidden" name="metaName" id="new-meta-hidden" />
              <input type="hidden" name="language" value={DEFAULT_LANGUAGE} />
              <label htmlFor="new-body">DM body</label>
              <textarea id="new-body" name="bodyText" rows={3} />
            </>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label htmlFor="new-media-type">Media</label>
              <select
                id="new-media-type"
                name="headerMediaType"
                defaultValue="none"
              >
                <option value="none">none</option>
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="document">document</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-media-url">Media HTTPS URL</label>
              <input id="new-media-url" name="headerMediaUrl" type="url" />
            </div>
          </div>

          <input type="hidden" name="bodyVars" value={isIg ? 0 : 1} />
          <input type="hidden" name="buttonUrlCount" value={0} />
          <input type="hidden" name="category" value="lifecycle" />

          <label className="cmd-check-row">
            <input type="checkbox" name="enabled" defaultChecked />
            Enabled
          </label>

          <button
            className="cmd-btn cmd-btn-sm cmd-btn-primary"
            disabled={pending}
            type="submit"
          >
            Create template
          </button>
        </form>
      </div>
    </div>
  );
}

/** @deprecated use MetaTemplatesForm */
export function WhatsAppTemplatesForm({
  templates,
}: {
  templates: MetaTemplateRow[];
}) {
  return <MetaTemplatesForm channel="whatsapp" templates={templates} />;
}
