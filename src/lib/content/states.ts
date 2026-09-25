import "server-only";

import type { ContentAssetState } from "@/generated/prisma/client";

/**
 * Part 07 workflow states used on upload / compliance / publish paths.
 * Legacy DB values (`uploaded`, `posted`, `rejected`, `editing`, `review`)
 * remain valid aliases via {@link normalizeContentState}.
 */
export const CONTENT_PIPELINE_STATES = [
  "draft",
  "tagged",
  "in_plan",
  "brief_locked",
  "in_edit",
  "in_qc",
  "changes_requested",
  "compliance",
  "ready",
  "awaiting_kane",
  "scheduled",
  "published",
  "failed",
] as const satisfies readonly ContentAssetState[];

export type ContentPipelineState = (typeof CONTENT_PIPELINE_STATES)[number];

/** Canonical write targets for new code paths (Part 07 names). */
export const ContentState = {
  draft: "draft",
  tagged: "tagged",
  inPlan: "in_plan",
  briefLocked: "brief_locked",
  inEdit: "in_edit",
  /** @deprecated Prefer {@link ContentState.inEdit} */
  editing: "editing",
  inQc: "in_qc",
  changesRequested: "changes_requested",
  /** @deprecated Prefer {@link ContentState.inQc} */
  review: "review",
  compliance: "compliance",
  ready: "ready",
  awaitingKane: "awaiting_kane",
  scheduled: "scheduled",
  published: "published",
  failed: "failed",
  archived: "archived",
} as const satisfies Record<string, ContentAssetState>;

/** Typical forward transitions (not enforced in DB — guidance for callers). */
export const CONTENT_TRANSITIONS: Partial<
  Record<ContentAssetState, readonly ContentAssetState[]>
> = {
  draft: ["tagged", ContentState.failed],
  tagged: [ContentState.inPlan, ContentState.archived],
  uploaded: ["tagged", ContentState.draft],
  in_plan: [ContentState.briefLocked],
  brief_locked: [ContentState.inEdit],
  in_edit: [ContentState.inQc],
  editing: [ContentState.inQc, ContentState.review],
  in_qc: [ContentState.compliance, ContentState.changesRequested],
  review: [ContentState.compliance, ContentState.changesRequested],
  changes_requested: [ContentState.inEdit, ContentState.inQc],
  compliance: [ContentState.ready, ContentState.changesRequested],
  ready: [ContentState.awaitingKane],
  awaiting_kane: [
    ContentState.scheduled,
    ContentState.changesRequested,
    ContentState.failed,
  ],
  scheduled: [ContentState.published, ContentState.failed],
  published: [ContentState.archived],
  failed: [ContentState.ready, ContentState.awaitingKane, ContentState.inEdit],
};

/** Map Frame.io status labels → content asset state when possible. */
export function mapFrameStatusToContentState(
  status: string | undefined | null,
): ContentAssetState | null {
  if (!status) return null;
  const s = status.toLowerCase().replace(/[\s-]+/g, "_");

  if (
    s.includes("changes_requested") ||
    s.includes("needs_changes") ||
    s.includes("reject") ||
    s.includes("fail") ||
    (s.includes("changes") && !s.includes("no_changes"))
  ) {
    return ContentState.changesRequested;
  }
  if (
    s.includes("needs_review") ||
    s.includes("in_review") ||
    s.includes("in_qc") ||
    s === "qc" ||
    s === "review" ||
    s.includes("comment")
  ) {
    return ContentState.inQc;
  }
  if (
    s.includes("in_progress") ||
    s.includes("editing") ||
    s === "in_edit"
  ) {
    return ContentState.inEdit;
  }
  if (s.includes("brief") && s.includes("lock")) {
    return ContentState.briefLocked;
  }
  if (s.includes("in_plan") || s === "planned") {
    return ContentState.inPlan;
  }
  if (
    s.includes("approved") ||
    s.includes("version_ready") ||
    s === "ready" ||
    s.includes("ready") ||
    s === "done" ||
    s === "complete"
  ) {
    return ContentState.ready;
  }
  return null;
}

/** Treat legacy posted/rejected/editing/review as Part 07 names for display. */
export function normalizeContentState(
  state: ContentAssetState,
): ContentPipelineState | ContentAssetState {
  if (state === "uploaded") return "draft";
  if (state === "posted") return "published";
  if (state === "rejected") return "failed";
  if (state === "editing") return "in_edit";
  if (state === "review") return "in_qc";
  return state;
}
