import "server-only";

const BANNED =
  /\b(testosterone|trt|hormone|anabolic|steroid|clomid|enclomiphene)\b/i;

export function runComplianceCheck(input: {
  caption?: string | null;
  transcript?: string | null;
  onScreenText?: string | null;
}) {
  const corpus = [input.caption, input.transcript, input.onScreenText]
    .filter(Boolean)
    .join("\n");

  const match = corpus.match(BANNED);
  if (match) {
    return {
      pass: false as const,
      result: `FAIL — banned health claim "${match[0]}" found`,
    };
  }

  return {
    pass: true as const,
    result: "No hormone/TRT claims found",
  };
}
