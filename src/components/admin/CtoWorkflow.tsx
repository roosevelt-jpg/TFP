"use client";

import { useState } from "react";

import {
  ACTION_LANES,
  DEPARTMENTS,
  HARD_WALLS,
  WORKFLOW_STEPS,
  type DepartmentId,
  type WorkflowLaneId,
} from "@/lib/cto/workflow";

export type CtoActivity = {
  id: string;
  at: string;
  title: string;
  detail: string;
};

type Props = {
  activity: CtoActivity[];
  pending: CtoActivity[];
};

export function CtoWorkflow({ activity, pending }: Props) {
  const [desk, setDesk] = useState<DepartmentId | "all">("all");
  const [lane, setLane] = useState<WorkflowLaneId>("meta");

  const selected = DEPARTMENTS.find((d) => d.id === desk);
  const activeLanes =
    selected?.lanes ?? ACTION_LANES.map((item) => item.id);
  const shownLane = activeLanes.includes(lane) ? lane : activeLanes[0]!;
  const laneMeta = ACTION_LANES.find((item) => item.id === shownLane)!;

  return (
    <div className="wf">
      <div className="wf-board" aria-label="How the CTO works">
        <div className="wf-col">
          <div className="wf-kicker">Watches</div>
          {DEPARTMENTS.map((dept) => {
            const on = desk === "all" || desk === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                className={`wf-card${on ? " is-on" : ""}${desk === dept.id ? " is-picked" : ""}`}
                onClick={() =>
                  setDesk((current) => (current === dept.id ? "all" : dept.id))
                }
              >
                <span className="wf-avatar">{dept.name[0]}</span>
                <span>
                  <span className="wf-name">{dept.name}</span>
                  <span className="wf-role">{dept.title}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="wf-rail" aria-hidden="true" />

        <div className="wf-col wf-col-center">
          <div className="wf-kicker">Operators</div>
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step.id} className={`wf-step wf-step-${step.id}`}>
              <div className="wf-step-index">{index + 1}</div>
              <div>
                <div className="wf-name">{step.label}</div>
                <div className="wf-role">{step.detail}</div>
              </div>
              {index < WORKFLOW_STEPS.length - 1 ? (
                <span className="wf-arrow" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="wf-rail" aria-hidden="true" />

        <div className="wf-col">
          <div className="wf-kicker">In action</div>
          {ACTION_LANES.map((item) => {
            const available = activeLanes.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`wf-card${shownLane === item.id ? " is-picked" : ""}${available ? "" : " is-off"}`}
                disabled={!available}
                onClick={() => setLane(item.id)}
              >
                <span>
                  <span className="wf-name">{item.label}</span>
                  <span className="wf-role">{item.reaches}</span>
                </span>
                <span className={`wf-pill${item.needsKane ? " needs" : ""}`}>
                  {item.needsKane ? "Kane" : "Draft"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="wf-detail">
        <div>
          <div className="wf-kicker">
            {selected ? selected.name : "Every desk"} · {laneMeta.label}
          </div>
          <p className="wf-lead">
            {selected
              ? selected.ctoDoes
              : "The CTO reads every desk, then only drafts. Writes stop at Kane."}
          </p>
          <p className="wf-never">
            {selected ? selected.never : HARD_WALLS.join(" · ")}
          </p>
          {selected ? (
            <ul className="wf-watch">
              {selected.watches.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <ol className="wf-path">
          <li>CTO reads the warehouse and this desk.</li>
          <li>
            {shownLane === "read"
              ? "It returns the numbers. Nothing is written."
              : shownLane === "desk"
                ? "It drops a todo on the person’s desk."
                : `It drafts “${laneMeta.label.replace(/^Draft a /, "")}”.`}
          </li>
          <li>
            {laneMeta.needsKane
              ? "Specialist blocks money, subscriptions, and workflow edits."
              : "No specialist pass — this is a read or an internal todo."}
          </li>
          <li>
            {laneMeta.needsKane
              ? "Kane approves on Alerts, or it never leaves Command."
              : "Kane still sees it in the audit trail."}
          </li>
        </ol>
      </div>

      <div className="wf-walls">
        {HARD_WALLS.map((wall) => (
          <span key={wall}>{wall}</span>
        ))}
      </div>

      <div className="wf-live">
        <section>
          <div className="wf-kicker">Waiting on Kane</div>
          {pending.length === 0 ? (
            <p className="wf-empty">No CTO drafts waiting.</p>
          ) : (
            <ul>
              {pending.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                  <time>{item.at}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="wf-kicker">Recent CTO runs</div>
          {activity.length === 0 ? (
            <p className="wf-empty">
              No runs yet. The agent writes here after the first prompt.
            </p>
          ) : (
            <ul>
              {activity.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                  <time>{item.at}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
