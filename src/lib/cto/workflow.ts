/**
 * Operating picture of the CTO agent. Matches src/lib/cto/agent.ts and
 * src/lib/cto/specialist.ts — a map Kane can read, not a second rules engine.
 */

export type WorkflowLaneId = "read" | "meta" | "email" | "desk";

export type DepartmentId = "leah" | "lemoni" | "indigo" | "asim";

export type WorkflowStep = {
  id: string;
  label: string;
  detail: string;
};

export type DepartmentDesk = {
  id: DepartmentId;
  name: string;
  title: string;
  watches: string[];
  lanes: WorkflowLaneId[];
  ctoDoes: string;
  never: string;
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "sources",
    label: "Desks & warehouse",
    detail: "Alerts, yesterday’s numbers, stock, team todos and reports.",
  },
  {
    id: "cto",
    label: "CTO agent",
    detail: "Reads, drafts, and flags gaps. It does not send, publish, or pay.",
  },
  {
    id: "specialist",
    label: "Specialist check",
    detail: "Blocks money, subscriptions, and Indigo’s automations before Kane sees them.",
  },
  {
    id: "kane",
    label: "Kane",
    detail: "Approve or reject. Nothing external happens until this tap.",
  },
];

export const DEPARTMENTS: DepartmentDesk[] = [
  {
    id: "leah",
    name: "Leah",
    title: "Finance & customer service",
    watches: ["Money snapshot", "Inbox", "Open alerts"],
    lanes: ["read", "email", "desk"],
    ctoDoes: "Can draft a reply for Kane, or put a gap on Leah’s desk.",
    never: "Never refunds, pays out, or changes a subscription.",
  },
  {
    id: "lemoni",
    name: "Lemoni",
    title: "Affiliates, content & PA",
    watches: ["Content pipeline", "Affiliate desk", "Reports"],
    lanes: ["read", "desk"],
    ctoDoes: "Reviews her desk and can flag a missed report or overdue todo.",
    never: "Does not publish a post. Content still waits on Kane’s card.",
  },
  {
    id: "indigo",
    name: "Indigo",
    title: "GHL / n8n automation",
    watches: ["Connector status", "Workflow health"],
    lanes: ["read", "desk"],
    ctoDoes: "Reads whether automations are up, and can flag a gap on his desk.",
    never: "Never edits a GHL or n8n workflow.",
  },
  {
    id: "asim",
    name: "Asim",
    title: "UK pick & pack",
    watches: ["Low stock", "Fulfilment queue"],
    lanes: ["read", "desk"],
    ctoDoes: "Sees cover days and can flag a packing or stock gap.",
    never: "Does not create shipments or touch Shopify orders.",
  },
];

export const ACTION_LANES: Array<{
  id: WorkflowLaneId;
  label: string;
  reaches: string;
  needsKane: boolean;
}> = [
  {
    id: "read",
    label: "Read the numbers",
    reaches: "Warehouse summary only",
    needsKane: false,
  },
  {
    id: "meta",
    label: "Draft a Meta pause",
    reaches: "One ad set, after specialist + Kane",
    needsKane: true,
  },
  {
    id: "email",
    label: "Draft a Gmail reply",
    reaches: "One email, after specialist + Kane",
    needsKane: true,
  },
  {
    id: "desk",
    label: "Flag a team gap",
    reaches: "A todo on that person’s desk",
    needsKane: false,
  },
];

export const HARD_WALLS = [
  "No agent moves money",
  "Subscriptions are mirror-only",
  "Indigo owns workflow edits",
  "Live ad attribution stays untouched",
];
