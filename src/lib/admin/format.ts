import {
  coerceCurrencyCode,
  type CurrencyCode,
} from "@/lib/i18n/catalog";

export function formatMoney(
  minorUnits: number,
  currency: string = "GBP",
): string {
  const code = coerceCurrencyCode(currency);
  const major = minorUnits / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

/** @deprecated prefer formatMoney — GBP-only helper kept for call sites. */
export function formatGbp(pence: number): string {
  return formatMoney(pence, "GBP");
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

export type { CurrencyCode };
