"use client";

import { useState, useTransition } from "react";

import {
  acknowledgeAlertAction,
  decideApprovalAction,
} from "@/actions/admin/approvals.action";

type AlertRow = {
  id: string;
  ruleId: string;
  severity: string;
  title: string;
  status: string;
  firedAt: string;
};

type ApprovalRow = {
  id: string;
  action: string;
  status: string;
  reach: string | null;
  reversible: boolean;
  specialistVerdict: string | null;
  expiresAt: string;
};

type LogRow = {
  id: string;
  action: string;
  status: string;
  verificationResult: string | null;
  updatedAt: string;
};

export function AlertsClient({
  open,
  approvals,
  log,
}: {
  open: AlertRow[];
  approvals: ApprovalRow[];
  log: LogRow[];
}) {
  const [tab, setTab] = useState<"open" | "approvals" | "log">("open");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      {message ? <div className="cmd-section-note">{message}</div> : null}
      <div className="cmd-tabs">
        {(
          [
            ["open", "Open alerts"],
            ["approvals", "Approvals"],
            ["log", "Full log"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`cmd-tab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "open"
        ? open.map((alert) => (
            <div key={alert.id} className={`cmd-alert-card ${alert.severity}`}>
              <div>
                <div className="cmd-alert-id">
                  {alert.ruleId} · {alert.severity.toUpperCase()}
                </div>
                <div className="cmd-alert-what">{alert.title}</div>
                <div className="cmd-alert-meta">
                  <span>{new Date(alert.firedAt).toLocaleString("en-GB")}</span>
                  <span>{alert.status}</span>
                </div>
              </div>
              <div className="cmd-alert-actions">
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm"
                  disabled={pending || alert.status !== "open"}
                  onClick={() =>
                    startTransition(async () => {
                      await acknowledgeAlertAction({ id: alert.id });
                      setMessage(`Acknowledged ${alert.ruleId}`);
                    })
                  }
                >
                  Acknowledge
                </button>
              </div>
            </div>
          ))
        : null}

      {tab === "approvals"
        ? approvals.map((row) => (
            <div key={row.id} className="cmd-approval-card">
              <div className="cmd-approval-top">
                <div>
                  <div className="cmd-alert-id">{row.status.toUpperCase()}</div>
                  <div className="cmd-approval-what">{row.action}</div>
                </div>
              </div>
              <div className="cmd-approval-grid">
                <div>
                  <span>Reach</span>
                  {row.reach ?? "—"}
                </div>
                <div>
                  <span>Reversible</span>
                  {row.reversible ? "Yes" : "No"}
                </div>
                <div>
                  <span>Expires</span>
                  {new Date(row.expiresAt).toLocaleString("en-GB")}
                </div>
              </div>
              {row.specialistVerdict ? (
                <div className="cmd-approval-check">{row.specialistVerdict}</div>
              ) : null}
              {row.status === "pending" ? (
                <div className="cmd-approval-foot">
                  <button
                    type="button"
                    className="cmd-btn cmd-btn-sm cmd-btn-danger"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await decideApprovalAction({
                          id: row.id,
                          decision: "rejected",
                        });
                        setMessage(`Rejected: ${row.action}`);
                      })
                    }
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="cmd-btn cmd-btn-sm cmd-btn-primary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await decideApprovalAction({
                          id: row.id,
                          decision: "approved",
                        });
                        setMessage(`Approved: ${row.action}`);
                      })
                    }
                  >
                    Approve
                  </button>
                </div>
              ) : null}
            </div>
          ))
        : null}

      {tab === "log" ? (
        <div className="cmd-panel">
          <div className="cmd-panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-strong">{row.action}</td>
                    <td>{row.status}</td>
                    <td className="cell-muted">
                      {row.verificationResult ?? "—"}
                    </td>
                    <td className="cell-muted">
                      {new Date(row.updatedAt).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
