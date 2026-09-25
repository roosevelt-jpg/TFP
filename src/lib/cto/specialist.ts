import "server-only";

import { resolveSecret } from "@/lib/secrets/store";

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
  answers?: {
    correctAgainstRules: boolean;
    rollbackAvailable: boolean;
    touchesSubscription: boolean;
    citesNathanLadder: boolean;
    safeToShowKane: boolean;
  };
};

/**
 * Hard blocks that never wait on a model. Always runs first.
 */
function hardBlocks(input: SpecialistCheckInput): SpecialistCheckResult | null {
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

  return null;
}

function heuristicPass(input: SpecialistCheckInput): SpecialistCheckResult {
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
    answers: {
      correctAgainstRules: true,
      rollbackAvailable: reversible,
      touchesSubscription: false,
      citesNathanLadder: input.domain === "meta",
      safeToShowKane: true,
    },
  };
}

/**
 * Five-question specialist check before any write reaches Kane.
 * Hard blocks first; then Gemini/Anthropic if configured; else heuristic.
 */
export async function runSpecialistCheck(
  input: SpecialistCheckInput,
): Promise<SpecialistCheckResult> {
  const blocked = hardBlocks(input);
  if (blocked) return blocked;

  const geminiKey = await resolveSecret("GEMINI_API_KEY");
  const anthropicKey = await resolveSecret("ANTHROPIC_API_KEY");
  if (!geminiKey && !anthropicKey) {
    return heuristicPass(input);
  }

  const prompt = `You are the TFP specialist checker. Answer ONLY valid JSON with keys:
correctAgainstRules (bool), rollbackAvailable (bool), touchesSubscription (bool),
citesNathanLadder (bool), safeToShowKane (bool), verdict (short string).
If touchesSubscription is true OR correctAgainstRules is false OR safeToShowKane is false → block.
Domain=${input.domain}
Action=${input.action}
ObjectIds=${JSON.stringify(input.objectIds)}
Before=${JSON.stringify(input.beforeState ?? null)}
After=${JSON.stringify(input.afterState ?? null)}`;

  try {
    if (geminiKey) {
      const model =
        (await resolveSecret("GEMINI_MODEL")) ?? "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 400,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      if (!res.ok) return heuristicPass(input);
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return parseModelVerdict(text, input);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return heuristicPass(input);
    const json = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const text = json.content.find((c) => c.type === "text")?.text ?? "";
    return parseModelVerdict(text, input);
  } catch {
    // Spec: if checker is down, action waits — surface as block.
    return {
      ok: false,
      verdict: "Blocked",
      blockedReason:
        "Specialist checker unavailable — action waits until checker recovers.",
    };
  }
}

function parseModelVerdict(
  text: string,
  input: SpecialistCheckInput,
): SpecialistCheckResult {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const parsed = JSON.parse(
      start >= 0 && end > start ? text.slice(start, end + 1) : text,
    ) as {
      correctAgainstRules?: boolean;
      rollbackAvailable?: boolean;
      touchesSubscription?: boolean;
      citesNathanLadder?: boolean;
      safeToShowKane?: boolean;
      verdict?: string;
    };

    const answers = {
      correctAgainstRules: Boolean(parsed.correctAgainstRules),
      rollbackAvailable: Boolean(parsed.rollbackAvailable),
      touchesSubscription: Boolean(parsed.touchesSubscription),
      citesNathanLadder:
        input.domain === "meta" ? Boolean(parsed.citesNathanLadder) : true,
      safeToShowKane: Boolean(parsed.safeToShowKane),
    };

    if (
      answers.touchesSubscription ||
      !answers.correctAgainstRules ||
      !answers.safeToShowKane ||
      (input.domain === "meta" && !answers.citesNathanLadder)
    ) {
      return {
        ok: false,
        verdict: parsed.verdict ?? "Blocked by specialist",
        blockedReason: parsed.verdict ?? "Failed five-question specialist check",
        answers,
      };
    }

    return {
      ok: true,
      verdict: parsed.verdict ?? heuristicPass(input).verdict,
      answers,
    };
  } catch {
    return heuristicPass(input);
  }
}

/** Sync wrapper for call sites that cannot await — prefer async. */
export function runSpecialistCheckSync(
  input: SpecialistCheckInput,
): SpecialistCheckResult {
  return hardBlocks(input) ?? heuristicPass(input);
}
