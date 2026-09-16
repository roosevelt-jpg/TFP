import "server-only";

export type SpecialistCheckInput = {
  action: string;
  objectIds: Record<string, unknown>;
  beforeState?: unknown;
  afterState?: unknown;
  domain: "meta" | "shopify" | "klaviyo" | "gmail" | "content" | "other";
};

export type SpecialistCheckResult = {
  ok: boolean;
  verdict: string;
  blockedReason?: string;
};

/**
 * Read-only specialist check before any write reaches Kane.
 * Blocks subscription / money / Indigo workflow touches hard.
 */
export function runSpecialistCheck(
  input: SpecialistCheckInput,
): SpecialistCheckResult {
  const blob = JSON.stringify(input).toLowerCase();

  if (
    /subscription|kaching|loop selling plan|selling_plan|recurring application charge/.test(
      blob,
    )
  ) {
    return {
      ok: false,
      verdict: "Blocked",
      blockedReason:
        "Subscriptions are no-touch — mirror only. Never reaches Kane.",
    };
  }

  if (
    /refund|payout|transfer|revolut.?pay|move money|wire|bank.?pay/.test(blob) &&
    input.domain !== "gmail"
  ) {
    return {
      ok: false,
      verdict: "Blocked",
      blockedReason: "No agent ever moves money.",
    };
  }

  if (/n8n|workflow.?edit|ghl.?workflow|automation.?edit/.test(blob)) {
    return {
      ok: false,
      verdict: "Blocked",
      blockedReason: "Indigo owns GHL/n8n workflows — read status only.",
    };
  }

  if (input.domain === "meta" && /attribution|optimization.?goal/.test(blob)) {
    return {
      ok: false,
      verdict: "Blocked",
      blockedReason: "Never change attribution settings on live ad sets.",
    };
  }

  if (input.domain === "content" && /hormone|testosterone|\btrt\b/.test(blob)) {
    return {
      ok: false,
      verdict: "Blocked",
      blockedReason: "Compliance FAIL — hormone/TRT language.",
    };
  }

  const reversible =
    input.domain === "meta" ||
    input.domain === "content" ||
    /pause|resume|label/.test(input.action.toLowerCase());

  return {
    ok: true,
    verdict: [
      "Correct against operating rules.",
      reversible ? "Rollback available." : "Send/publish is final.",
      "Touches no subscription.",
      input.domain === "meta" ? "Cites Nathan ladder layer check." : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
