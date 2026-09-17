"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  assignTodoAction,
  reviewStaffReportAction,
} from "@/actions/admin/staff.action";

type Report = {
  id: string;
  personKey: string;
  periodLabel: string;
  body: string;
  submittedAt: string | null;
  authorName?: string;
};

type Props = {
  reports: Report[];
};

export function KaneReviewQueue({ reports }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function review(reportId: string, decision: "approved" | "rejected") {
    setError(null);
    const note =
      typeof window !== "undefined"
        ? window.prompt("Optional note for the team member") ?? ""
        : "";
    startTransition(async () => {
      const res = await reviewStaffReportAction({
        reportId,
        decision,
        note: note || undefined,
      });
      if (res?.serverError) {
        setError(res.serverError);
        return;
      }
      router.refresh();
    });
  }

  function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await assignTodoAction({
        personKey: String(form.get("personKey")) as
          | "leah"
          | "lemoni"
          | "indigo"
          | "asim",
        title: String(form.get("title") ?? ""),
      });
      if (res?.serverError || res?.validationErrors) {
        setError(res.serverError ?? "Could not assign");
        return;
      }
      event.currentTarget.reset();
      router.refresh();
    });
  }

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-panel-title">Accountability queue</div>
          <div className="cmd-panel-sub">
            Reports awaiting your review · assign todos to hold people to account
          </div>
        </div>
      </div>
      <div className="cmd-panel-body">
        {error ? <div className="cmd-error">{error}</div> : null}

        <form className="cmd-cred-inputs" onSubmit={assign} style={{ marginBottom: 16 }}>
          <select name="personKey" defaultValue="leah" aria-label="Person">
            <option value="leah">Leah</option>
            <option value="lemoni">Lemoni</option>
            <option value="indigo">Indigo</option>
            <option value="asim">Asim</option>
          </select>
          <input
            name="title"
            required
            placeholder="Todo for them…"
            style={{ flex: 1 }}
          />
          <button
            className="cmd-btn cmd-btn-primary cmd-btn-sm"
            type="submit"
            disabled={pending}
          >
            Assign
          </button>
        </form>

        {reports.length === 0 ? (
          <div className="cmd-list-sub">No submitted reports waiting</div>
        ) : (
          reports.map((report) => (
            <div className="cmd-list-row" key={report.id} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cmd-list-title">
                  {report.personKey} · {report.periodLabel}
                </div>
                <div className="cmd-list-sub" style={{ whiteSpace: "pre-wrap" }}>
                  {report.body.slice(0, 400)}
                  {report.body.length > 400 ? "…" : ""}
                </div>
                <div className="cmd-list-sub">
                  {report.submittedAt
                    ? new Date(report.submittedAt).toLocaleString("en-GB")
                    : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm cmd-btn-primary"
                  disabled={pending}
                  onClick={() => review(report.id, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm"
                  disabled={pending}
                  onClick={() => review(report.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
