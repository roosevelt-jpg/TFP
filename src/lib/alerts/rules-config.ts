/**
 * Part 03 alert rule default thresholds.
 * Live values live in AlertThreshold (editable in /admin/settings).
 * Engine falls back to these when a rule has no enabled row.
 */

export type AlertThresholdDefault = {
  value: number;
  unit?: string;
  label: string;
};

export const DEFAULT_ALERT_THRESHOLDS: Record<string, AlertThresholdDefault> = {
  R1: {
    value: 6,
    unit: "hours",
    label: "Store quiet — no Shopify orders (Dubai business hours)",
  },
  R2: {
    value: 50,
    unit: "percent",
    label: "Today revenue vs trailing 4 same-weekday average (by 18:00 Dubai)",
  },
  R3: {
    value: 48,
    unit: "hours",
    label: "No training programme payment",
  },
  L1: {
    value: 60,
    unit: "minutes",
    label: "High-intent DM unanswered",
  },
  PY4: {
    value: 50,
    unit: "gbp",
    label: "Refund over cap",
  },
  M3: {
    value: 1000,
    unit: "gbp",
    label: "Daily Meta spend ceiling (alert at +15%)",
  },
  M3_OVER: {
    value: 15,
    unit: "percent",
    label: "Spend over daily ceiling tolerance",
  },
  M5_FREQ: {
    value: 2,
    unit: "frequency",
    label: "Cold ad set frequency over 7 days",
  },
  M5_CTR_DROP: {
    value: 30,
    unit: "percent",
    label: "CTR drop vs first clean week",
  },
  M5_MIN_SPEND: {
    value: 30,
    unit: "gbp",
    label: "Minimum spend for M5 fatigue",
  },
  CA1: {
    value: 10000,
    unit: "gbp",
    label: "Cash balance warning",
  },
  CA2: {
    value: 5000,
    unit: "gbp",
    label: "Cash balance critical",
  },
  ST1: {
    value: 30,
    unit: "days",
    label: "Low days of cover",
  },
  ST2: {
    value: 7,
    unit: "days",
    label: "Critical days of cover",
  },
  SY5: {
    value: 6,
    unit: "hours",
    label: "Connector stale lastSuccessAt",
  },
  K2_RECIPIENTS: {
    value: 1000,
    unit: "recipients",
    label: "K2 campaign size floor",
  },
  K3_BOUNCE: {
    value: 2,
    unit: "percent",
    label: "Bounce rate ceiling",
  },
  K3_SPAM: {
    value: 0.1,
    unit: "percent",
    label: "Spam complaint rate ceiling",
  },
  T1_SILENT: {
    value: 20,
    unit: "percent",
    label: "Silent training members share",
  },
  T1_SILENT_DAYS: {
    value: 3,
    unit: "days",
    label: "Days without activity = silent",
  },
  CT1_HOURS: {
    value: 24,
    unit: "hours",
    label: "Upload not tagged",
  },
  CT2_HOURS: {
    value: 12,
    unit: "hours",
    label: "Post awaiting Kane before slot",
  },
  CT8_DAYS: {
    value: 7,
    unit: "days",
    label: "Channel token expiring",
  },
  CT9_PCT: {
    value: 80,
    unit: "percent",
    label: "Publish limit utilisation",
  },
  CT10_MULT: {
    value: 3,
    unit: "x",
    label: "Negative comment spike vs normal",
  },
};

export function defaultThreshold(ruleId: string): number | undefined {
  return DEFAULT_ALERT_THRESHOLDS[ruleId]?.value;
}

export function resolveThreshold(
  byRule: Record<string, { value: number }>,
  ruleId: string,
  fallbackRuleId?: string,
): number {
  if (byRule[ruleId]?.value != null) return byRule[ruleId].value;
  if (fallbackRuleId && byRule[fallbackRuleId]?.value != null) {
    return byRule[fallbackRuleId].value;
  }
  return (
    DEFAULT_ALERT_THRESHOLDS[ruleId]?.value ??
    (fallbackRuleId
      ? (DEFAULT_ALERT_THRESHOLDS[fallbackRuleId]?.value ?? 0)
      : 0)
  );
}
