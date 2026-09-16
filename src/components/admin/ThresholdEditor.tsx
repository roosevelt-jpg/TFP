"use client";

import { useTransition } from "react";

import { updateThresholdAction } from "@/actions/admin/thresholds.action";

type Row = {
  id: string;
  ruleId: string;
  label: string;
  value: number;
  unit: string | null;
  enabled: boolean;
};

export function ThresholdEditor({ rows }: { rows: Row[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {rows.map((row) => (
        <form
          key={row.id}
          className="cmd-kpi-mini"
          style={{ gap: 8, alignItems: "center" }}
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              await updateThresholdAction({
                id: row.id,
                value: Number(form.get("value")),
                enabled: form.get("enabled") === "on",
              });
            });
          }}
        >
          <span className="l">
            {row.ruleId} · {row.label}
          </span>
          <span className="v" style={{ display: "flex", gap: 6 }}>
            <input
              name="value"
              type="number"
              step="any"
              defaultValue={row.value}
              style={{ width: 72 }}
            />
            <label>
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={row.enabled}
              />{" "}
              on
            </label>
            <button className="cmd-btn cmd-btn-sm" disabled={pending} type="submit">
              Save
            </button>
          </span>
        </form>
      ))}
    </div>
  );
}
