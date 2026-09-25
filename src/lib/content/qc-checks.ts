/**
 * Part 07 §12.8 quality checklist — each item mapped automated vs manual.
 * Automated checks run on the compliance / Frame QC path when meta is present.
 */

export type QcCheckMode = "automated" | "manual";

export type QcCheckId =
  | "frame_untouched"
  | "transcript_matches_brief"
  | "captions_correct"
  | "logo_correct"
  | "format_length"
  | "no_restricted_words"
  | "cover_frame"
  | "brief_reference";

export type QcCheckDef = {
  id: QcCheckId;
  label: string;
  mode: QcCheckMode;
  /** KB §8 wording. */
  kbItem: string;
};

/** Canonical map — Phase 6 acceptance: every checklist item appears here. */
export const QC_CHECKLIST: readonly QcCheckDef[] = [
  {
    id: "frame_untouched",
    label: "Frame untouched",
    mode: "automated",
    kbItem: "Kane talking-head frame untouched",
  },
  {
    id: "transcript_matches_brief",
    label: "Transcript matches brief",
    mode: "automated",
    kbItem: "No clipped words / no repeated sentences (transcript of render matches brief)",
  },
  {
    id: "captions_correct",
    label: "Captions correct",
    mode: "manual",
    kbItem: "Captions correct and readable",
  },
  {
    id: "logo_correct",
    label: "Logo correct",
    mode: "manual",
    kbItem: "Logo = complete silver wordmark",
  },
  {
    id: "format_length",
    label: "Format & length",
    mode: "automated",
    kbItem: "Format, length, safe zones correct per platform",
  },
  {
    id: "no_restricted_words",
    label: "No restricted words",
    mode: "automated",
    kbItem: "No restricted words on screen or in captions",
  },
  {
    id: "cover_frame",
    label: "Cover frame",
    mode: "manual",
    kbItem: "Cover / thumbnail frame set if required",
  },
  {
    id: "brief_reference",
    label: "Brief reference",
    mode: "manual",
    kbItem: "Brief reference ID noted in Frame.io comment",
  },
] as const;

export type QcCheckResult = {
  id: QcCheckId;
  label: string;
  mode: QcCheckMode;
  status: "pass" | "fail" | "skip" | "manual";
  detail: string;
};

export type QcRunInput = {
  caption?: string | null;
  brief?: string | null;
  transcript?: string | null;
  onScreenText?: string | null;
  ocr?: string | null;
  /** Asset tags / Frame enrichment. */
  assetMeta?: unknown;
  /** Compliance already ran — reuse pass/result for restricted words. */
  compliancePass?: boolean | null;
  complianceResult?: string | null;
  platform?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Very light overlap: shared significant tokens between brief and transcript. */
function transcriptMatchesBrief(brief: string, transcript: string): boolean {
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3);
  const b = new Set(tokens(brief));
  const t = tokens(transcript);
  if (b.size === 0 || t.length === 0) return false;
  let hit = 0;
  for (const w of t) {
    if (b.has(w)) hit += 1;
  }
  return hit / Math.min(b.size, 40) >= 0.15;
}

function framingUntouched(meta: Record<string, unknown> | null): {
  status: "pass" | "fail" | "skip";
  detail: string;
} {
  if (!meta) {
    return { status: "skip", detail: "No framing meta — skipped" };
  }
  if (
    meta.framingChanged === true ||
    meta.framing_changed === true ||
    meta.qcFramingFail === true
  ) {
    return {
      status: "fail",
      detail: "Framing changed vs source (talking-head re-frame detected)",
    };
  }
  if (
    meta.framingChanged === false ||
    meta.framing_changed === false ||
    meta.framingUntouched === true ||
    meta.frame_untouched === true
  ) {
    return { status: "pass", detail: "Framing marked untouched vs source" };
  }
  return {
    status: "skip",
    detail: "Framing comparison not available on asset meta",
  };
}

function formatLengthOk(
  meta: Record<string, unknown> | null,
  platform: string | null | undefined,
): { status: "pass" | "fail" | "skip"; detail: string } {
  if (!meta) {
    return { status: "skip", detail: "No duration/aspect meta — skipped" };
  }
  const durationSec =
    num(meta.durationSec) ?? num(meta.duration) ?? num(meta.lengthSec);
  const aspect = str(meta.aspectRatio) ?? str(meta.aspect);
  const p = (platform ?? "").toLowerCase();
  const vertical =
    p.includes("instagram") ||
    p.includes("tiktok") ||
    p.includes("shorts") ||
    p.includes("reel");

  if (durationSec == null && !aspect) {
    return { status: "skip", detail: "No duration/aspect meta — skipped" };
  }

  if (vertical && aspect && !/9\s*[:/]\s*16|0\.56|0\.5625/i.test(aspect)) {
    return {
      status: "fail",
      detail: `Expected 9:16 for ${platform ?? "vertical"}; got ${aspect}`,
    };
  }
  if (p.includes("youtube") && !p.includes("short") && aspect) {
    if (!/16\s*[:/]\s*9|1\.77/i.test(aspect)) {
      return {
        status: "fail",
        detail: `Expected 16:9 for YouTube long-form; got ${aspect}`,
      };
    }
  }
  if (p.includes("short") && durationSec != null && durationSec > 180) {
    return {
      status: "fail",
      detail: `Shorts length ${durationSec}s exceeds typical Shorts limit`,
    };
  }
  return {
    status: "pass",
    detail: [
      durationSec != null ? `${durationSec}s` : null,
      aspect ?? null,
    ]
      .filter(Boolean)
      .join(" · ") || "Format/length OK",
  };
}

/**
 * Run automated QC checks. Manual items return status `manual` (editor tick list).
 * Keys optional — missing meta → `skip`, never invents a fail.
 */
export function runAutomatedQcChecks(input: QcRunInput): {
  results: QcCheckResult[];
  pass: boolean;
  framingFail: boolean;
  transcriptFail: boolean;
} {
  const meta = asRecord(input.assetMeta);
  const brief =
    input.brief ?? str(meta?.brief) ?? str(meta?.lockedBrief) ?? null;
  const transcript =
    input.transcript ?? str(meta?.transcript) ?? null;
  const ocr =
    input.ocr ??
    input.onScreenText ??
    str(meta?.ocr) ??
    str(meta?.onScreenText) ??
    null;

  const results: QcCheckResult[] = [];

  for (const def of QC_CHECKLIST) {
    if (def.mode === "manual") {
      results.push({
        id: def.id,
        label: def.label,
        mode: "manual",
        status: "manual",
        detail: "Manual editor checklist item",
      });
      continue;
    }

    if (def.id === "frame_untouched") {
      const r = framingUntouched(meta);
      results.push({
        id: def.id,
        label: def.label,
        mode: "automated",
        status: r.status,
        detail: r.detail,
      });
      continue;
    }

    if (def.id === "transcript_matches_brief") {
      if (!brief || !transcript) {
        results.push({
          id: def.id,
          label: def.label,
          mode: "automated",
          status: "skip",
          detail: "Brief or transcript missing — skipped",
        });
      } else if (transcriptMatchesBrief(brief, transcript)) {
        results.push({
          id: def.id,
          label: def.label,
          mode: "automated",
          status: "pass",
          detail: "Transcript overlaps brief tokens",
        });
      } else {
        results.push({
          id: def.id,
          label: def.label,
          mode: "automated",
          status: "fail",
          detail: "Transcript does not sufficiently match the locked brief",
        });
      }
      continue;
    }

    if (def.id === "format_length") {
      const r = formatLengthOk(meta, input.platform);
      results.push({
        id: def.id,
        label: def.label,
        mode: "automated",
        status: r.status,
        detail: r.detail,
      });
      continue;
    }

    if (def.id === "no_restricted_words") {
      if (input.compliancePass === false) {
        results.push({
          id: def.id,
          label: def.label,
          mode: "automated",
          status: "fail",
          detail: input.complianceResult ?? "Compliance FAIL — restricted words",
        });
      } else if (input.compliancePass === true) {
        results.push({
          id: def.id,
          label: def.label,
          mode: "automated",
          status: "pass",
          detail: input.complianceResult ?? "No restricted words",
        });
      } else if (ocr || transcript || input.caption) {
        // Caller should prefer runComplianceCheck; without it, skip.
        results.push({
          id: def.id,
          label: def.label,
          mode: "automated",
          status: "skip",
          detail: "Run compliance check first for restricted-word verdict",
        });
      } else {
        results.push({
          id: def.id,
          label: def.label,
          mode: "automated",
          status: "skip",
          detail: "No caption/OCR/transcript — skipped",
        });
      }
      continue;
    }

    results.push({
      id: def.id,
      label: def.label,
      mode: def.mode,
      status: "skip",
      detail: "Unhandled automated check",
    });
  }

  const framingFail = results.some(
    (r) => r.id === "frame_untouched" && r.status === "fail",
  );
  const transcriptFail = results.some(
    (r) => r.id === "transcript_matches_brief" && r.status === "fail",
  );
  const pass = !results.some((r) => r.status === "fail");

  return { results, pass, framingFail, transcriptFail };
}

/** Merge QC outcomes into asset tags for §7.5 QC flag. */
export function qcResultsToAssetTags(
  run: ReturnType<typeof runAutomatedQcChecks>,
): Record<string, unknown> {
  return {
    qcResults: run.results,
    framingChanged: run.framingFail,
    transcriptMismatch: run.transcriptFail,
    qcPass: run.pass,
  };
}
