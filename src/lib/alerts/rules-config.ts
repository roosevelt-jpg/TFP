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
  // Event / enable-flag rules (Part 03) — seed so Settings covers every rule id
  L2: {
    value: 24,
    unit: "hours",
    label: "Booked call at risk — confirmation window",
  },
  PY1: {
    value: 1,
    unit: "flag",
    label: "High-ticket payment landed (enable)",
  },
  PY2: {
    value: 1,
    unit: "flag",
    label: "Payment failed (enable)",
  },
  PY3: {
    value: 1,
    unit: "flag",
    label: "Dispute / chargeback (enable)",
  },
  PY5: {
    value: 1,
    unit: "flag",
    label: "Billing interval mismatch (enable)",
  },
  SY1: {
    value: 2,
    unit: "failures",
    label: "Site/checkout uptime fails in a row",
  },
  SY2: {
    value: 2,
    unit: "failures",
    label: "Training site / booking link fails in a row",
  },
  SY3: {
    value: 1,
    unit: "flag",
    label: "Escalation Router failed (enable)",
  },
  SY4: {
    value: 3,
    unit: "failures",
    label: "n8n workflow failures in an hour",
  },
  CA3: {
    value: 7,
    unit: "days",
    label: "Payment due vs projected cash window",
  },
  CA4: {
    value: 13,
    unit: "hour",
    label: "Leah template missing by Dubai hour",
  },
  CL1: {
    value: 1,
    unit: "flag",
    label: "New booking alert (enable)",
  },
  CL2: {
    value: 1,
    unit: "flag",
    label: "Cancellation / reschedule (enable)",
  },
  CL5: {
    value: 10,
    unit: "minutes",
    label: "No-show after call start",
  },
  ON1: {
    value: 1,
    unit: "flag",
    label: "Onboarding overdue (enable)",
  },
  C1: {
    value: 1,
    unit: "flag",
    label: "Complaint (enable)",
  },
  C2: {
    value: 1,
    unit: "flag",
    label: "Health / adverse reaction (enable)",
  },
  C3: {
    value: 1,
    unit: "flag",
    label: "Legal / regulatory (enable)",
  },
  E1: {
    value: 1,
    unit: "flag",
    label: "Important sender email (enable)",
  },
  E2: {
    value: 1,
    unit: "flag",
    label: "Needs Kane reply (enable)",
  },
  T1: {
    value: 20,
    unit: "percent",
    label: "Silent training members share (T1)",
  },
  T2: {
    value: 6,
    unit: "week",
    label: "Completion approaching — week of 8",
  },
  CT1: {
    value: 24,
    unit: "hours",
    label: "Upload not tagged (CT1)",
  },
  CT2: {
    value: 12,
    unit: "hours",
    label: "Post awaiting Kane before slot (CT2)",
  },
  CT3: {
    value: 1,
    unit: "flag",
    label: "Compliance fail (enable)",
  },
  CT4: {
    value: 1,
    unit: "flag",
    label: "Publish failed (enable)",
  },
  CT5: {
    value: 1,
    unit: "flag",
    label: "Post live (enable)",
  },
  CT6: {
    value: 18,
    unit: "hour",
    label: "Calendar gap check from Dubai hour",
  },
  CT7: {
    value: 1,
    unit: "flag",
    label: "Platform strike (enable)",
  },
  CT8: {
    value: 7,
    unit: "days",
    label: "Channel token expiring (CT8)",
  },
  CT9: {
    value: 80,
    unit: "percent",
    label: "Publish limit utilisation (CT9)",
  },
  CT10: {
    value: 3,
    unit: "x",
    label: "Negative comment spike vs normal (CT10)",
  },
  CT11: {
    value: 18,
    unit: "hour",
    label: "Weekly Posting Plan not agreed by Dubai hour Mon",
  },
  CT12: {
    value: 20,
    unit: "hour",
    label: "Tomorrow's posts digest Dubai hour",
  },
  M1: {
    value: 1,
    unit: "flag",
    label: "Ad or account problem (enable)",
  },
  M2: {
    value: 1,
    unit: "flag",
    label: "Meta payment failed (enable)",
  },
  M4: {
    value: 3,
    unit: "days",
    label: "Below break-even clean days",
  },
  M5: {
    value: 2,
    unit: "frequency",
    label: "Cold ad set frequency over 7 days (M5)",
  },
  K1: {
    value: 1,
    unit: "flag",
    label: "Klaviyo flow stopped (enable)",
  },
  K2: {
    value: 1000,
    unit: "recipients",
    label: "K2 campaign size floor (K2)",
  },
  K3: {
    value: 2,
    unit: "percent",
    label: "Bounce rate ceiling (K3)",
  },
  K4: {
    value: 24,
    unit: "hours",
    label: "Two big sends window",
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


export type AlertSeverity = "p1" | "p2" | "p3";

/**
 * Default severity per rule id (Part 03). Used by test-fire and as a reference;
 * the engine may escalate conditionally for a few rules (CL1, E1, CT3).
 */
export const ALERT_RULE_SEVERITIES: Record<string, AlertSeverity> = {
  R1: "p1",
  R2: "p2",
  R3: "p2",
  L1: "p1",
  L2: "p2",
  PY1: "p1",
  PY2: "p1",
  PY3: "p1",
  PY4: "p1",
  PY5: "p1",
  ST1: "p2",
  ST2: "p1",
  SY1: "p1",
  SY2: "p1",
  SY3: "p1",
  SY4: "p2",
  SY5: "p2",
  CA1: "p2",
  CA2: "p1",
  CA3: "p1",
  CA4: "p2",
  CL1: "p1",
  CL2: "p2",
  CL5: "p2",
  ON1: "p2",
  C1: "p2",
  C2: "p1",
  C3: "p1",
  E1: "p1",
  E2: "p2",
  T1: "p2",
  T2: "p2",
  CT1: "p2",
  CT2: "p2",
  CT3: "p1",
  CT4: "p1",
  CT5: "p3",
  CT6: "p2",
  CT7: "p1",
  CT8: "p2",
  CT9: "p2",
  CT10: "p1",
  CT11: "p2",
  CT12: "p3",
  M1: "p1",
  M2: "p1",
  M3: "p1",
  M4: "p2",
  M5: "p3",
  K1: "p1",
  K2: "p2",
  K3: "p1",
  K4: "p1",
};

export function resolveRuleSeverity(ruleId: string): AlertSeverity {
  return ALERT_RULE_SEVERITIES[ruleId] ?? "p2";
}

export function listAlertRuleIds(): string[] {
  return Object.keys(ALERT_RULE_SEVERITIES).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

/**
 * Every seedable threshold id: numeric helpers (CT1_HOURS, M3_OVER, …)
 * plus every Part 03 rule id in ALERT_RULE_SEVERITIES.
 */
export function listSeedableThresholdIds(): string[] {
  const ids = new Set([
    ...Object.keys(DEFAULT_ALERT_THRESHOLDS),
    ...Object.keys(ALERT_RULE_SEVERITIES),
  ]);
  return [...ids].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function thresholdDefaultFor(
  ruleId: string,
): AlertThresholdDefault | undefined {
  return (
    DEFAULT_ALERT_THRESHOLDS[ruleId] ??
    (ALERT_RULE_SEVERITIES[ruleId]
      ? {
          value: 1,
          unit: "flag",
          label: `${ruleId} (enable)`,
        }
      : undefined)
  );
}
