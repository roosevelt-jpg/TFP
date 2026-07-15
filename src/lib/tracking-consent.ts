export type TrackingConsent = "granted" | "denied";

type ConsentListener = (consent: TrackingConsent) => void;

// A cookie, not localStorage: the server action must honor the same decision
// when it captures its twin conversion event, and cookies are the only
// client-writable state the server can read.
export const TRACKING_CONSENT_COOKIE = "tfp_tracking_consent";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// No banner yet: absent a stored decision, tracking is on (client-accepted
// risk). The consent banner PR flips this default and adds the UI — both the
// client gate and the server twin resolve through this one constant.
const DEFAULT_CONSENT: TrackingConsent = "granted";

// In-memory only: a decision made in another tab won't reach this one until
// reload. Acceptable while nothing in the UI writes consent; the banner PR
// should add cross-tab sync (BroadcastChannel) alongside the UI.
const listeners = new Set<ConsentListener>();

export function resolveTrackingConsent(
  raw: string | undefined,
): TrackingConsent {
  return raw === "granted" || raw === "denied" ? raw : DEFAULT_CONSENT;
}

export function getStoredTrackingConsent(): TrackingConsent | undefined {
  try {
    const match = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${TRACKING_CONSENT_COOKIE}=`));
    const raw = match?.slice(TRACKING_CONSENT_COOKIE.length + 1);
    return raw === "granted" || raw === "denied" ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function getTrackingConsent(): TrackingConsent {
  return getStoredTrackingConsent() ?? DEFAULT_CONSENT;
}

export function setTrackingConsent(consent: TrackingConsent): void {
  try {
    const secure = location.protocol === "https:" ? "; secure" : "";
    // biome-ignore lint/suspicious/noDocumentCookie: the suggested Cookie Store API is async (this gate must read synchronously at init) and not yet available in all supported Safari/Firefox versions.
    document.cookie = `${TRACKING_CONSENT_COOKIE}=${consent}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${secure}`;
  } catch {
    // Blocked cookie write: the choice still applies to this page via listeners.
  }
  for (const listener of listeners) {
    listener(consent);
  }
}

export function onTrackingConsentChange(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
