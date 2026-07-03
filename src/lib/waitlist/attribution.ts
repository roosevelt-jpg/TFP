"use client";

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  gclid?: string;
  referrer?: string;
  landingPath?: string;
};

const STORAGE_KEY = "tfp_attribution";
const MAX_LEN = 300;

const UTM_PARAMS = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
  fbclid: "fbclid",
  gclid: "gclid",
} as const satisfies Record<string, keyof Attribution>;

function readFromUrl(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const data: Attribution = {};

  for (const [param, key] of Object.entries(UTM_PARAMS)) {
    const value = params.get(param)?.trim().slice(0, MAX_LEN);
    if (value) data[key] = value;
  }

  const referrer = document.referrer?.slice(0, 1000);
  if (referrer && !referrer.startsWith(window.location.origin)) {
    data.referrer = referrer;
  }
  data.landingPath = window.location.pathname.slice(0, 1000);

  return data;
}

// Safe to call on every load — writes only if nothing is stored (first touch wins).
export function captureAttribution(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const data = readFromUrl();
    const hasSignal = Object.keys(data).some((k) => k !== "landingPath");
    if (hasSignal) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Best-effort: localStorage can throw in private mode / on quota.
  }
}

export function getAttribution(): Attribution | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    // Non-object (tampered/legacy) degrades to undefined instead of failing the
    // whole signup when the server schema rejects it.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}
