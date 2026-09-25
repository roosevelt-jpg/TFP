import { AdminShell } from "@/components/admin/AdminShell";
import {
  getSpecCompletionChecklist,
  SPEC_STATUS_LABEL,
  type SpecPhase,
  type SpecStatus,
} from "@/lib/admin/spec-completion";
import { requireAdminSession } from "@/lib/auth/session";

const PHASE_TITLES: Record<SpecPhase, string> = {
  0: "Phase 0 — Foundation",
  1: "Phase 1 — Money & Meta truth",
  2: "Phase 2 — Daily report, alerts, to-do",
  3: "Phase 3 — Finance feed & P&L",
  4: "Phase 4 — People, programmes, inboxes",
  5: "Phase 5 — CTO actions & remaining feeds",
  6: "Phase 6 — Content Studio",
};

const STATUS_CLASS: Record<SpecStatus, string> = {
  done: "cmd-badge cmd-badge-live",
  waiting_on_keys: "cmd-badge cmd-badge-p2",
  waiting_on_kane_live: "cmd-badge cmd-badge-calculated",
  out_of_scope: "cmd-badge cmd-badge-paused",
};

export default async function SpecCompletionPage() {
  await requireAdminSession(["kane"]);
  const report = getSpecCompletionChecklist();

  return (
    <AdminShell titleKey="spec-completion">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          Roosevelt pack CODE checklist — implementable deliverables are
          complete. Live acceptance still needs keys and Kane demos.
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title">Summary</div>
            <div className="cmd-panel-sub">
              Snapshot · {new Date(report.generatedAt).toLocaleString("en-GB")}
            </div>
          </div>
        </div>
        <div className="cmd-panel-body">
          <div className="cmd-list-row">
            <div className="cmd-list-title">
              {report.summary.done} code done · {report.summary.waiting_on_keys}{" "}
              waiting on keys · {report.summary.waiting_on_kane_live} waiting on
              Kane / live · {report.summary.out_of_scope} out of scope
            </div>
            <div className="cmd-list-sub">
              Connectors use resolveSecret and skip gracefully without keys. See{" "}
              <code>docs/command-runbook.md</code> → Keys to paste.
            </div>
          </div>
        </div>
      </div>

      {([0, 1, 2, 3, 4, 5, 6] as SpecPhase[]).map((phase) => (
        <div className="cmd-panel" key={phase}>
          <div className="cmd-panel-head">
            <div>
              <div className="cmd-panel-title">{PHASE_TITLES[phase]}</div>
              <div className="cmd-panel-sub">
                {report.byPhase[phase].length} deliverables
              </div>
            </div>
          </div>
          <div className="cmd-panel-body">
            {report.byPhase[phase].map((item) => (
              <div className="cmd-list-row" key={item.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cmd-list-title">{item.title}</div>
                  <div className="cmd-list-sub">{item.note}</div>
                  {item.paths && item.paths.length > 0 ? (
                    <div className="cmd-list-sub" style={{ opacity: 0.7 }}>
                      {item.paths.join(" · ")}
                    </div>
                  ) : null}
                </div>
                <span className={STATUS_CLASS[item.status]}>
                  {SPEC_STATUS_LABEL[item.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </AdminShell>
  );
}
