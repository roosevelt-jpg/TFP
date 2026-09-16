export function formatGbp(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: pounds % 1 === 0 ? 0 : 2,
  }).format(pounds);
}

export function formatDelta(pct: number): string {
  if (pct === 0) return "flat";
  const arrow = pct > 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(pct)}%`;
}

export function relativeFreshness(at: Date | null | undefined): string {
  if (!at) return "—";
  const mins = Math.round((Date.now() - at.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return at.toLocaleDateString("en-GB");
}

export function labelClass(
  label: "verified" | "recorded" | "calculated",
): string {
  if (label === "verified") return "cmd-badge cmd-badge-verified";
  if (label === "recorded") return "cmd-badge cmd-badge-recorded";
  return "cmd-badge cmd-badge-calculated";
}
