"use client";

import { useState, useTransition } from "react";

import { agreeWeeklyPlanAction } from "@/actions/admin/weekly-plan.action";

type Plan = {
  id: string;
  weekStart: string;
  status: string;
  agreedAt: string | null;
  notes: string | null;
};

export function WeeklyPlanPanel({ plan }: { plan: Plan | null }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(plan?.status ?? "none");
  const [agreedAt, setAgreedAt] = useState(plan?.agreedAt ?? null);

  const weekLabel = plan?.weekStart ?? "this week";

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div className="cmd-panel-title">Weekly Posting Plan</div>
      </div>
      <div className="cmd-panel-body">
        <div className="cmd-section-note">
          Week of {weekLabel} · status: {status}
          {agreedAt
            ? ` · agreed ${new Date(agreedAt).toLocaleString("en-GB", {
                timeZone: "Asia/Dubai",
              })}`
            : ""}
        </div>
        {plan?.notes ? (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              opacity: 0.85,
              marginBottom: 12,
            }}
          >
            {plan.notes.slice(0, 800)}
          </pre>
        ) : null}
        <button
          type="button"
          className="cmd-btn cmd-btn-primary"
          disabled={pending || status === "agreed"}
          onClick={() =>
            startTransition(async () => {
              const res = await agreeWeeklyPlanAction({});
              if (res?.data) {
                setStatus(res.data.status);
                setAgreedAt(res.data.agreedAt);
              }
            })
          }
        >
          {status === "agreed" ? "Plan agreed" : "Agree this week's plan"}
        </button>
      </div>
    </div>
  );
}
