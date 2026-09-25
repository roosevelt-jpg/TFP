import "server-only";

const BANNED =
  /\b(testosterone|trt|hormone|anabolic|steroid|clomid|enclomiphene)\b/i;

/** Placeholder timecode until real OCR/ASR timestamps land. */
export const COMPLIANCE_TIMECODE_PLACEHOLDER = "t=0:00";

export type AssetComplianceMeta = {
  caption?: string | null;
  transcript?: string | null;
  onScreenText?: string | null;
  ocr?: string | null;
  [key: string]: unknown;
};

function asMetaRecord(
  value: unknown,
): AssetComplianceMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as AssetComplianceMeta;
}

/** Pull caption / transcript / OCR text from an asset tags/meta bag. */
export function extractComplianceTextFromMeta(meta: unknown): {
  caption?: string;
  transcript?: string;
  onScreenText?: string;
} {
  const bag = asMetaRecord(meta);
  if (!bag) return {};

  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  return {
    caption: str(bag.caption),
    transcript: str(bag.transcript),
    onScreenText: str(bag.onScreenText) ?? str(bag.ocr),
  };
}

export function runComplianceCheck(input: {
  caption?: string | null;
  transcript?: string | null;
  onScreenText?: string | null;
  /** ContentAsset.tags / Frame enrichment — OCR & transcript checked when present. */
  assetMeta?: unknown;
}) {
  const fromMeta = extractComplianceTextFromMeta(input.assetMeta);
  const corpus = [
    input.caption,
    fromMeta.caption,
    input.transcript,
    fromMeta.transcript,
    input.onScreenText,
    fromMeta.onScreenText,
  ]
    .filter(Boolean)
    .join("\n");

  const match = corpus.match(BANNED);
  if (match) {
    return {
      pass: false as const,
      result: `FAIL — banned health claim "${match[0]}" at ${COMPLIANCE_TIMECODE_PLACEHOLDER}`,
    };
  }

  return {
    pass: true as const,
    result: "No hormone/TRT claims found",
  };
}

/**
 * OCR / transcript compliance hook — runs keyword checks when asset meta
 * carries caption, transcript, or on-screen OCR text. FAIL includes `t=0:00`.
 */
export function runOcrTranscriptCompliance(assetMeta: unknown) {
  const fromMeta = extractComplianceTextFromMeta(assetMeta);
  const hasText = Boolean(
    fromMeta.caption || fromMeta.transcript || fromMeta.onScreenText,
  );
  if (!hasText) {
    return {
      ran: false as const,
      pass: true as const,
      result: "No OCR/transcript text on asset meta — skipped",
    };
  }

  const check = runComplianceCheck({ assetMeta });
  return {
    ran: true as const,
    pass: check.pass,
    result: check.result,
  };
}
