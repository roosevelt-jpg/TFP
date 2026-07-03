// `label` is the select option text; `logged` is the phrase used in the
// "we've logged your … request" confirmation. `waitlist` marks the types that
// make sense before payments go live; the rest need a live membership and are
// gated behind PAYMENTS_LIVE (see src/lib/launch.ts).
type SupportTypeOption = {
  value: string;
  label: string;
  logged: string;
  waitlist: boolean;
};

export const SUPPORT_TYPE_OPTIONS = [
  {
    value: "general",
    label: "General question",
    logged: "general question",
    waitlist: true,
  },
  {
    value: "billing",
    label: "Billing & payments",
    logged: "billing",
    waitlist: false,
  },
  {
    value: "wa",
    label: "Change my WhatsApp number",
    logged: "WhatsApp number change",
    waitlist: true,
  },
  {
    value: "pause",
    label: "Pause my membership",
    logged: "membership pause",
    waitlist: false,
  },
  {
    value: "cancel",
    label: "Cancel my membership",
    logged: "cancellation",
    waitlist: false,
  },
  {
    value: "refund",
    label: "Request a refund",
    logged: "refund",
    waitlist: false,
  },
  {
    value: "other",
    label: "Something else",
    logged: "support",
    waitlist: true,
  },
] as const satisfies readonly SupportTypeOption[];

export type SupportOption = (typeof SUPPORT_TYPE_OPTIONS)[number];
export type SupportType = SupportOption["value"];

// Derived from the options so the Zod enum can't drift from the rendered list.
export const SUPPORT_TYPE_VALUES = SUPPORT_TYPE_OPTIONS.map((o) => o.value) as [
  SupportType,
  ...SupportType[],
];

const SUPPORT_TYPE_SET: ReadonlySet<string> = new Set(SUPPORT_TYPE_VALUES);

export function isSupportType(value: string | undefined): value is SupportType {
  return value !== undefined && SUPPORT_TYPE_SET.has(value);
}

// The options a visitor can pick right now: all of them once payments are live,
// otherwise just the waitlist-safe subset.
export function visibleSupportOptions(paymentsLive: boolean) {
  return paymentsLive
    ? SUPPORT_TYPE_OPTIONS
    : SUPPORT_TYPE_OPTIONS.filter((o) => o.waitlist);
}

// Types that touch billing dates: they surface the "heads up on timing" note in
// the form and the cancellation reassurance on the confirmation. Only reachable
// once payments are live.
export const TIMING_NOTE_TYPES = new Set<SupportType>([
  "pause",
  "cancel",
  "refund",
]);
