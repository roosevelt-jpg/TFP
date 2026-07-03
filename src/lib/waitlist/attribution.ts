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

/**
 * Persists first-touch attribution on the first visit. Safe to call on every
 * page load — it only writes if nothing is stored yet (first touch wins).
 */
export function captureAttribution(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const data = readFromUrl();

    const hasSignal = Object.keys(data).some((k) => k !== "landingPath");
    if (hasSignal) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage can throw (private mode, quota) — attribution is best-effort.
  }
}

/** The stored first-touch attribution, or undefined if none was captured. */
export function getAttribution(): Attribution | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    // Only a plain object is valid attribution — anything else (a tampered or
    // legacy value) degrades to undefined rather than failing the whole signup
    // when the server schema rejects it.
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
