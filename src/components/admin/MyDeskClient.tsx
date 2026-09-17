"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  completeTodoAction,
  submitStaffReportAction,
} from "@/actions/admin/staff.action";

type Todo = {
  id: string;
  title: string;
  dueAt: string | null;
  status: string;
};

type Report = {
  id: string;
  periodLabel: string;
  status: string;
  submittedAt: string | null;
  reviewNote: string | null;
};

type Kpi = {
  id: string;
  kpiId: string;
  value: string;
  label: string;
};

type Props = {
  todos: Todo[];
  reports: Report[];
  kpis: Kpi[];
  personName: string;
  roleTitle: string;
  shortcuts: Array<{ href: string; label: string }>;
};

export function MyDeskClient({
  todos,
  reports,
  kpis,
  personName,
  roleTitle,
  shortcuts,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function complete(todoId: string) {
    setError(null);
    startTransition(async () => {
      const res = await completeTodoAction({ todoId });
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      router.refresh();
    });
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await submitStaffReportAction({
        periodLabel: String(form.get("periodLabel") ?? ""),
        body: String(form.get("body") ?? ""),
      });
      if (res?.serverError || res?.validationErrors) {
        setError(res.serverError ?? "Could not submit report");
        return;
      }
      setMessage("Report submitted — Kane will review it");
      event.currentTarget.reset();
      router.refresh();
    });
  }

  return (
    <>
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          <strong>{personName}</strong> · {roleTitle}. Your scorecard, todos and
          reports live here — Kane and the CTO agent monitor this desk.
        </div>
      </div>

      {message ? <div className="cmd-success">{message}</div> : null}
      {error ? <div className="cmd-error">{error}</div> : null}

      {shortcuts.length > 0 ? (
        <div className="cmd-section-note" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {shortcuts.map((s) => (
            <a key={s.href} className="cmd-btn cmd-btn-sm" href={s.href}>
              {s.label}
            </a>
          ))}
        </div>
      ) : null}

      <div className="cmd-kpi-grid">
        <div className="cmd-person-card" style={{ gridColumn: "1 / -1" }}>
          <div className="cmd-person-top">
            <div className="cmd-person-avatar">{personName[0]}</div>
            <div>
              <div className="cmd-person-name">Your scorecard</div>
              <div className="cmd-person-role">Today’s KPIs</div>
            </div>
          </div>
          {kpis.length === 0 ? (
            <div className="cmd-list-sub">not measurable yet</div>
          ) : (
            kpis.map((kpi) => (
              <div className="cmd-kpi-mini" key={kpi.id}>
                <span className="l">{kpi.kpiId}</span>
                <span className="v">{kpi.value}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">What you need to do</div>
          </div>
          <div className="cmd-panel-body">
            {todos.length === 0 ? (
              <div className="cmd-list-sub">No open todos</div>
            ) : (
              todos.map((todo) => (
                <div className="cmd-list-row" key={todo.id}>
                  <div>
                    <div className="cmd-list-title">{todo.title}</div>
                    <div className="cmd-list-sub">
                      {todo.dueAt
                        ? `Due ${new Date(todo.dueAt).toLocaleString("en-GB")}`
                        : "No due date"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cmd-btn cmd-btn-sm cmd-btn-primary"
                    disabled={pending}
                    onClick={() => complete(todo.id)}
                  >
                    Done
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title">Submit report to Kane</div>
          </div>
          <div className="cmd-panel-body">
            <form onSubmit={submitReport} className="cmd-stack-form">
              <label>
                Period
                <input
                  name="periodLabel"
                  required
                  placeholder="e.g. Week of 15 Sep / Daily 16 Sep"
                />
              </label>
              <label>
                Report
                <textarea
                  name="body"
                  required
                  rows={8}
                  placeholder="Position, blockers, decisions needed, numbers…"
                />
              </label>
              <button
                className="cmd-btn cmd-btn-primary"
                type="submit"
                disabled={pending}
              >
                Submit for review
              </button>
            </form>

            <div style={{ marginTop: 16 }}>
              <div className="cell-strong" style={{ marginBottom: 8 }}>
                Recent submissions
              </div>
              {reports.length === 0 ? (
                <div className="cmd-list-sub">None yet</div>
              ) : (
                reports.map((r) => (
                  <div className="cmd-list-row" key={r.id}>
                    <div>
                      <div className="cmd-list-title">{r.periodLabel}</div>
                      <div className="cmd-list-sub">
                        {r.status}
                        {r.submittedAt
                          ? ` · ${new Date(r.submittedAt).toLocaleString("en-GB")}`
                          : ""}
                        {r.reviewNote ? ` · ${r.reviewNote}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
