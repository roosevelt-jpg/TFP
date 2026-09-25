/**
 * Part 07 §7.5 — flags on Kane's approval card.
 * Most flags are advisory; consent/licence and compliance FAIL block one-tap.
 */

import {
  FOUNDER_PRICE_TODAY,
  LAUNCH_PROMOTION_CODE,
  PRICE_MONTHLY,
  PRICE_TODAY,
} from "@/lib/pricing";

export type PostCardFlagId =
  | "compliance"
  | "off_plan"
  | "wrong_offer"
  | "claims_risk"
  | "consent_licence"
  | "competitor"
  | "qc"
  | "account_safety"
  | "reputational";

export type PostCardFlag = {
  id: PostCardFlagId;
  label: string;
  detail: string;
  /** Cannot approve until resolved (consent / licence). */
  blocksApproval: boolean;
  /** Cannot one-tap approve; health FAIL needs typed Kane confirmation. */
  blocksOneTap: boolean;
};

export type PostCardFlagsInput = {
  caption?: string | null;
  compliancePass?: boolean | null;
  complianceResult?: string | null;
  creatorLicence?: boolean | null;
  publicConsent?: boolean | null;
  /** Platform + account for this card. */
  platform?: string | null;
  account?: string | null;
  scheduledAt?: Date | string | null;
  /** Asset / Frame tags bag (QC meta, reputational, etc.). */
  assetTags?: unknown;
  /** Agreed Weekly Posting Plan notes (or null if none / draft). */
  wppStatus?: string | null;
  wppNotes?: string | null;
  /** Channel paused / strike signal. */
  channelPaused?: boolean | null;
  channelWarning?: boolean | null;
};

const CLAIMS_RE =
  /\b(before\s*[&/]\s*after|before.?after|testosterone|trt|hormone|anabolic|steroid|clomid|enclomiphene|medical|diagnos|cure|treat(ment|s)?|body.?transform|results?\s+in\s+\d+\s*(day|week|month)s?)\b/i;

const COMPETITOR_RE =
  /\b(gymshark|myprotein|bulk\s*powders?|huel|whoop|levels?\s*health|renpho|ladder|future\s*method|train\.?hero|centrum|optimale?)\b/i;

const PROMO_CODE_RE = /\b([A-Z][A-Z0-9]{3,19})\b/g;

const PRICE_RE = /(?:£|gbp\s*)(\d+(?:\.\d{1,2})?)/gi;

const LIVE_CODES = new Set([LAUNCH_PROMOTION_CODE.toUpperCase()]);
const LIVE_PRICES = new Set([
  String(PRICE_TODAY),
  String(FOUNDER_PRICE_TODAY),
  String(PRICE_MONTHLY),
  formatPrice(FOUNDER_PRICE_TODAY),
]);

function formatPrice(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function truthyTag(tags: Record<string, unknown> | null, keys: string[]) {
  if (!tags) return false;
  for (const key of keys) {
    const v = tags[key];
    if (v === true || v === "true" || v === 1) return true;
    if (typeof v === "string" && /fail|changed|mismatch|risk/i.test(v)) {
      return true;
    }
  }
  return false;
}

function corpusFrom(input: PostCardFlagsInput) {
  const tags = asRecord(input.assetTags);
  const parts = [
    input.caption,
    input.complianceResult,
    tags?.caption,
    tags?.transcript,
    tags?.onScreenText,
    tags?.ocr,
    tags?.brief,
  ];
  return parts
    .filter((p) => typeof p === "string" && p.trim())
    .join("\n");
}

function isCleanPass(
  pass: boolean | null | undefined,
  result: string | null | undefined,
) {
  if (pass === false) return false;
  if (!result) return pass === true;
  const r = result.trim();
  if (!r) return pass === true;
  if (/^fail\b/i.test(r) || /\bfail\b/i.test(r)) return false;
  // "No hormone/TRT claims found" and similar are clean.
  if (/^pass\b/i.test(r)) return true;
  return pass === true;
}

function offPlan(input: PostCardFlagsInput): boolean {
  if (!input.wppStatus || input.wppStatus !== "agreed") return true;
  const notes = (input.wppNotes ?? "").toLowerCase();
  if (!notes.trim()) return true;
  const account = (input.account ?? "").toLowerCase();
  const platform = (input.platform ?? "").toLowerCase();
  if (account && !notes.includes(account.replace(/^@/, ""))) {
    // Soft: if notes list accounts and this one is missing → off-plan
    if (/@|instagram|tiktok|youtube/.test(notes) && account) {
      if (!notes.includes(account) && !notes.includes(account.replace(/^@/, ""))) {
        return true;
      }
    }
  }
  if (platform && notes.includes("platform") && !notes.includes(platform)) {
    return true;
  }
  return false;
}

function wrongOffer(caption: string): string | null {
  const codes = [...caption.toUpperCase().matchAll(PROMO_CODE_RE)].map(
    (m) => m[1]!,
  );
  for (const code of codes) {
    // Skip common non-promo tokens
    if (
      /^(HTTP|HTTPS|WEEK|REEL|SHORT|TIKTOK|PASS|FAIL|TFP|WPP)$/i.test(code)
    ) {
      continue;
    }
    if (!LIVE_CODES.has(code)) {
      return `Promo code "${code}" is not a live store/programme offer`;
    }
  }
  for (const m of caption.matchAll(PRICE_RE)) {
    const amount = m[1]!;
    if (!LIVE_PRICES.has(amount)) {
      return `Price £${amount} does not match live programme pricing`;
    }
  }
  return null;
}

/**
 * Compute §7.5 flags for a post card. Pure — pass WPP / channel context in.
 */
export function computePostCardFlags(
  input: PostCardFlagsInput,
): PostCardFlag[] {
  const flags: PostCardFlag[] = [];
  const tags = asRecord(input.assetTags);
  const text = corpusFrom(input);
  const clean = isCleanPass(input.compliancePass, input.complianceResult);

  if (!clean) {
    flags.push({
      id: "compliance",
      label: "Compliance not PASS",
      detail:
        input.complianceResult?.trim() ||
        "Compliance result is not a clean PASS",
      blocksApproval: false,
      blocksOneTap: true,
    });
  }

  if (offPlan(input)) {
    flags.push({
      id: "off_plan",
      label: "Off-plan",
      detail:
        input.wppStatus !== "agreed"
          ? "No agreed Weekly Posting Plan for this slot"
          : "Content type, account or slot is not in the Weekly Posting Plan",
      blocksApproval: false,
      blocksOneTap: false,
    });
  }

  const offerIssue = wrongOffer(input.caption ?? "");
  if (offerIssue) {
    flags.push({
      id: "wrong_offer",
      label: "Wrong offer",
      detail: offerIssue,
      blocksApproval: false,
      blocksOneTap: false,
    });
  }

  if (CLAIMS_RE.test(text)) {
    flags.push({
      id: "claims_risk",
      label: "Claims risk",
      detail:
        "Health, medical, body-transformation or results claims / before-after imagery language detected",
      blocksApproval: false,
      blocksOneTap: false,
    });
  }

  const hasLicence = Boolean(input.creatorLicence);
  const hasConsent = Boolean(input.publicConsent);
  if (!hasLicence || !hasConsent) {
    const missing = [
      !hasConsent ? "public consent" : null,
      !hasLicence ? "creator licence" : null,
    ]
      .filter(Boolean)
      .join(" and ");
    flags.push({
      id: "consent_licence",
      label: "Consent / licence",
      detail: `Missing recorded ${missing} — cannot approve until recorded`,
      blocksApproval: true,
      blocksOneTap: true,
    });
  }

  if (COMPETITOR_RE.test(text)) {
    flags.push({
      id: "competitor",
      label: "Competitor named",
      detail: "Competitor named or shown — past ad disapprovals on comparison content",
      blocksApproval: false,
      blocksOneTap: false,
    });
  }

  if (
    truthyTag(tags, [
      "framingChanged",
      "framing_changed",
      "qcFramingFail",
      "transcriptMismatch",
      "transcript_mismatch",
      "qcFail",
    ])
  ) {
    flags.push({
      id: "qc",
      label: "QC flag",
      detail:
        "QC flags Kane's talking-head framing changed, or the transcript does not match the brief",
      blocksApproval: false,
      blocksOneTap: false,
    });
  }

  if (
    input.channelPaused ||
    input.channelWarning ||
    /strike|violation|restriction|warning|removed/i.test(
      input.complianceResult ?? "",
    )
  ) {
    flags.push({
      id: "account_safety",
      label: "Account safety",
      detail: "Platform account is under a warning, strike or restriction",
      blocksApproval: false,
      blocksOneTap: false,
    });
  }

  if (
    truthyTag(tags, [
      "reputationalRisk",
      "reputational_risk",
      "ctoReputational",
    ])
  ) {
    flags.push({
      id: "reputational",
      label: "Reputational risk",
      detail:
        "CTO rates it a reputational risk (controversial topic, personal matter, named person)",
      blocksApproval: false,
      blocksOneTap: false,
    });
  }

  return flags;
}

/** True when any flag blocks approval entirely (consent / licence). */
export function flagsBlockApproval(flags: PostCardFlag[]) {
  return flags.some((f) => f.blocksApproval);
}

/** True when one-tap approve is disallowed (compliance FAIL or consent). */
export function flagsBlockOneTap(flags: PostCardFlag[]) {
  return flags.some((f) => f.blocksOneTap);
}

/** Telegram / UI lines for Kane's card. */
export function formatFlagsForTelegram(flags: PostCardFlag[]) {
  if (flags.length === 0) return "FLAGS: none";
  return [
    "FLAGS:",
    ...flags.map(
      (f) =>
        `· ${f.label}${f.blocksApproval ? " [BLOCKS]" : f.blocksOneTap ? " [NO ONE-TAP]" : ""} — ${f.detail}`,
    ),
  ].join("\n");
}
