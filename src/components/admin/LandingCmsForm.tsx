"use client";

import { useTransition } from "react";

import { saveCmsFieldAction } from "@/actions/admin/cms.action";

type Field = { key: string; label: string; value: string };

export function LandingCmsForm({ fields }: { fields: Field[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-body">
        {fields.map((field) => (
          <form
            key={field.key}
            className="cmd-field"
            onSubmit={(event) => {
              event.preventDefault();
              const value = String(
                new FormData(event.currentTarget).get("value") ?? "",
              );
              startTransition(async () => {
                await saveCmsFieldAction({
                  namespace: "landing",
                  key: field.key,
                  value,
                });
              });
            }}
          >
            <label htmlFor={field.key}>{field.label}</label>
            <textarea
              id={field.key}
              name="value"
              defaultValue={field.value}
              rows={field.key.includes("headline") || field.key.includes("final") ? 3 : 2}
            />
            <button className="cmd-btn cmd-btn-sm cmd-btn-primary" disabled={pending} type="submit">
              Save
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
