"use client";

import { useMemo, useState } from "react";

import {
  ACTION_LANES,
  DEPARTMENTS,
  HARD_WALLS,
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

type NodeTone = "source" | "cto" | "action" | "gate" | "kane" | "stop" | "block";

type FlowNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kicker: string;
  title: string;
  sub: string;
  tone: NodeTone;
};

type FlowEdge = {
  id: string;
  from: string;
  to: string;
  lane?: WorkflowLaneId | "in" | "block";
  desks?: DepartmentId[];
  blocked?: boolean;
};

const W = 1080;
const H = 520;

const NODES: FlowNode[] = [
  { id: "warehouse", x: 16, y: 16, w: 188, h: 68, kicker: "Source", title: "Warehouse", sub: "Alerts, cash, stock", tone: "source" },
  { id: "leah", x: 16, y: 104, w: 188, h: 68, kicker: "Desk", title: "Leah", sub: "Finance & service", tone: "source" },
  { id: "lemoni", x: 16, y: 192, w: 188, h: 68, kicker: "Desk", title: "Lemoni", sub: "Affiliates & content", tone: "source" },
  { id: "indigo", x: 16, y: 280, w: 188, h: 68, kicker: "Desk", title: "Indigo", sub: "GHL / n8n status", tone: "source" },
  { id: "asim", x: 16, y: 368, w: 188, h: 68, kicker: "Desk", title: "Asim", sub: "Pick & pack", tone: "source" },
  { id: "cto", x: 292, y: 176, w: 200, h: 96, kicker: "Operator", title: "CTO agent", sub: "Reads and drafts only", tone: "cto" },
  { id: "read", x: 580, y: 16, w: 188, h: 68, kicker: "Action", title: "Read numbers", sub: "No write", tone: "action" },
  { id: "meta", x: 580, y: 122, w: 188, h: 68, kicker: "Action", title: "Draft Meta pause", sub: "One ad set", tone: "action" },
  { id: "email", x: 580, y: 228, w: 188, h: 68, kicker: "Action", title: "Draft Gmail reply", sub: "Does not send", tone: "action" },
  { id: "desk", x: 580, y: 334, w: 188, h: 68, kicker: "Action", title: "Flag a team gap", sub: "Todo on that desk", tone: "action" },
  { id: "brief", x: 860, y: 16, w: 200, h: 68, kicker: "End", title: "Brief", sub: "Kane sees the numbers", tone: "stop" },
  { id: "specialist", x: 860, y: 150, w: 200, h: 72, kicker: "Gate", title: "Specialist", sub: "Rules check", tone: "gate" },
  { id: "kane", x: 860, y: 252, w: 200, h: 72, kicker: "Approve", title: "Kane", sub: "Nothing sends until this", tone: "kane" },
  { id: "todo", x: 860, y: 334, w: 200, h: 68, kicker: "End", title: "Desk todo", sub: "Internal only", tone: "stop" },
  { id: "blocked", x: 292, y: 420, w: 200, h: 72, kicker: "No connection", title: "Hard stop", sub: "Money, subs, n8n edits", tone: "block" },
];

const EDGES: FlowEdge[] = [
  { id: "wh-cto", from: "warehouse", to: "cto", lane: "in" },
  { id: "leah-cto", from: "leah", to: "cto", lane: "in", desks: ["leah"] },
  { id: "lemoni-cto", from: "lemoni", to: "cto", lane: "in", desks: ["lemoni"] },
  { id: "indigo-cto", from: "indigo", to: "cto", lane: "in", desks: ["indigo"] },
  { id: "asim-cto", from: "asim", to: "cto", lane: "in", desks: ["asim"] },
  { id: "cto-read", from: "cto", to: "read", lane: "read" },
  { id: "cto-meta", from: "cto", to: "meta", lane: "meta" },
  { id: "cto-email", from: "cto", to: "email", lane: "email", desks: ["leah"] },
  { id: "cto-desk", from: "cto", to: "desk", lane: "desk" },
  { id: "read-brief", from: "read", to: "brief", lane: "read" },
  { id: "meta-spec", from: "meta", to: "specialist", lane: "meta" },
  { id: "email-spec", from: "email", to: "specialist", lane: "email", desks: ["leah"] },
  { id: "spec-kane", from: "specialist", to: "kane", lane: "meta" },
  { id: "spec-kane-email", from: "specialist", to: "kane", lane: "email", desks: ["leah"] },
  { id: "desk-todo", from: "desk", to: "todo", lane: "desk" },
  { id: "cto-block", from: "cto", to: "blocked", lane: "block", blocked: true },
];

function nodeById(id: string) {
  const node = NODES.find((item) => item.id === id);
  if (!node) throw new Error(`Missing workflow node ${id}`);
  return node;
}

function curve(edge: FlowEdge) {
  const from = nodeById(edge.from);
  const to = nodeById(edge.to);
  const vertical = edge.blocked;
  const x1 = vertical ? from.x + from.w / 2 : from.x + from.w;
  const y1 = vertical ? from.y + from.h : from.y + from.h / 2;
  const x2 = vertical ? to.x + to.w / 2 : to.x;
  const y2 = vertical ? to.y : to.y + to.h / 2;
  const bend = Math.max(36, Math.abs(x2 - x1) * 0.45);
  if (vertical) {
    return `M ${x1} ${y1} C ${x1} ${y1 + 28}, ${x2} ${y2 - 28}, ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

export function CtoWorkflow({ activity, pending }: Props) {
  const [desk, setDesk] = useState<DepartmentId | "all">("all");
  const [lane, setLane] = useState<WorkflowLaneId | "all">("all");

  const selected = DEPARTMENTS.find((item) => item.id === desk);
  const laneMeta = ACTION_LANES.find((item) => item.id === lane);

  const hot = useMemo(() => {
    const lanesForDesk =
      selected?.lanes ?? ACTION_LANES.map((item) => item.id);
    return new Set(
      EDGES.filter((edge) => {
        if (edge.blocked || edge.lane === "block") return false;
        if (edge.lane === "in") {
          if (edge.from === "warehouse") return true;
          if (desk !== "all") return edge.from === desk;
          if (lane === "email") return edge.from === "leah";
          if (lane === "meta") return false;
          return true;
        }
        if (desk !== "all" && edge.lane && !lanesForDesk.includes(edge.lane as WorkflowLaneId)) {
          return false;
        }
        if (lane !== "all" && edge.lane !== lane) return false;
        return true;
      }).map((edge) => edge.id),
    );
  }, [desk, lane, selected]);

  function pickDesk(id: DepartmentId) {
    setDesk((current) => (current === id ? "all" : id));
    setLane("all");
  }

  function pickLane(id: WorkflowLaneId) {
    if (selected && !selected.lanes.includes(id)) return;
    setLane((current) => (current === id ? "all" : id));
  }

  return (
    <div className="wf">
      <div className="wf-canvas-scroll">
        <div className="wf-canvas" style={{ width: W, height: H }} aria-label="CTO workflow">
          <svg className="wf-wires" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
            {EDGES.map((edge) => {
              const on = hot.has(edge.id);
              return (
                <path
                  key={edge.id}
                  d={curve(edge)}
                  className={`wf-edge${on ? " is-hot" : ""}${edge.blocked ? " is-blocked" : ""}`}
                />
              );
            })}
          </svg>
          {NODES.map((node) => {
            const isDesk = DEPARTMENTS.some((item) => item.id === node.id);
            const isLane = ACTION_LANES.some((item) => item.id === node.id);
            const picked =
              (isDesk && desk === node.id) || (isLane && lane === node.id);
            const dim =
              (desk !== "all" && isDesk && desk !== node.id) ||
              (lane !== "all" && isLane && lane !== node.id) ||
              (selected &&
                isLane &&
                !selected.lanes.includes(node.id as WorkflowLaneId));
            const className = `wf-node tone-${node.tone}${picked ? " is-picked" : ""}${dim ? " is-dim" : ""}`;
            const style = { left: node.x, top: node.y, width: node.w, height: node.h };
            const hasIn = EDGES.some((edge) => edge.to === node.id && !edge.blocked);
            const hasOut = EDGES.some((edge) => edge.from === node.id && !edge.blocked);
            const ports = (
              <>
                {node.tone === "block" ? <span className="wf-port up" /> : null}
                {hasIn ? <span className="wf-port in" /> : null}
                {hasOut ? <span className="wf-port out" /> : null}
                {node.id === "cto" ? <span className="wf-port down" /> : null}
                <span className="wf-kicker">{node.kicker}</span>
                <span className="wf-name">{node.title}</span>
                <span className="wf-role">{node.sub}</span>
              </>
            );
            if (isDesk || isLane) {
              return (
                <button
                  key={node.id}
                  type="button"
                  className={className}
                  style={style}
                  onClick={() =>
                    isDesk
                      ? pickDesk(node.id as DepartmentId)
                      : pickLane(node.id as WorkflowLaneId)
                  }
                >
                  {ports}
                </button>
              );
            }
            return (
              <div key={node.id} className={className} style={style}>
                {ports}
              </div>
            );
          })}
        </div>
      </div>

      <div className="wf-detail">
        <div>
          <div className="wf-kicker">
            {selected ? selected.name : "All desks"}
            {laneMeta ? ` · ${laneMeta.label}` : ""}
          </div>
          <p className="wf-lead">
            {selected
              ? selected.ctoDoes
              : "Each desk connects into the CTO. Drafts that leave the building go through the specialist, then stop at Kane."}
          </p>
          <p className="wf-never">
            {selected ? selected.never : "Click a desk or an action to light that path."}
          </p>
          {selected ? (
            <ul className="wf-watch">
              {selected.watches.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="wf-walls">
          {HARD_WALLS.map((wall) => (
            <span key={wall}>{wall}</span>
          ))}
        </div>
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
            <p className="wf-empty">No runs yet. The agent writes here after the first prompt.</p>
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
