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
  // First-touch timestamp: Meta's _fbc format embeds the fbclid capture time,
  // so the Conversions API can't be retrofitted without it.
  capturedAt?: string;
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

export function captureAttribution(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      // First touches stored before capturedAt shipped get stamped on the
      // next visit: "first observed" is approximate but reconstructable for
      // Meta's _fbc, whereas null never is. The touch itself is untouched.
      const parsed: unknown = JSON.parse(stored);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        !("capturedAt" in parsed)
      ) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...parsed, capturedAt: new Date().toISOString() }),
        );
      }
      return;
    }
    const data = readFromUrl();
    const hasSignal = Object.keys(data).some((k) => k !== "landingPath");
    if (hasSignal) {
      data.capturedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
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
