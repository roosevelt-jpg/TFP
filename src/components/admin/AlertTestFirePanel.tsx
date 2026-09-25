"use client";

import { useState, useTransition } from "react";

import { testFireAlertAction } from "@/actions/admin/alert-test.action";

type RuleRow = {
  ruleId: string;
  severity: string;
  label?: string;
};

export function AlertTestFirePanel({ rules }: { rules: RuleRow[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <div>
      {message ? <div className="cmd-section-note">{message}</div> : null}
      <div className="cmd-panel-body">
        {rules.map((row) => (
          <div key={row.ruleId} className="cmd-list-row">
            <div>
              <div className="cmd-list-title">
                {row.ruleId} · {row.severity.toUpperCase()}
              </div>
              {row.label ? (
                <div className="cmd-list-sub">{row.label}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="cmd-btn cmd-btn-sm"
              disabled={pending}
              onClick={() => {
                setBusyId(row.ruleId);
                startTransition(async () => {
                  try {
                    const res = await testFireAlertAction({
                      ruleId: row.ruleId,
                    });
                    const data = res?.data;
                    setMessage(
                      data
                        ? `Fired ${data.ruleId} → ${data.alertId}`
                        : `Test fire requested for ${row.ruleId}`,
                    );
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : `Failed to fire ${row.ruleId}`,
                    );
                  } finally {
                    setBusyId(null);
                  }
                });
              }}
            >
              {busyId === row.ruleId ? "Firing…" : "Test"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
