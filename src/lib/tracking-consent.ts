export type TrackingConsent = "granted" | "denied";

type ConsentListener = (consent: TrackingConsent) => void;

// A cookie, not localStorage: the server action must honor the same decision
// when it captures its twin conversion event, and cookies are the only
// client-writable state the server can read.
export const TRACKING_CONSENT_COOKIE = "tfp_tracking_consent";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Denied until the banner records a choice — trackers only ever read the
// gate, so this constant is the entire "banner mode" switch. An undefined
// stored value is what tells the banner to show.
const DEFAULT_CONSENT: TrackingConsent = "denied";

// Cross-tab "the decision was cleared" marker (granted/denied carry
// themselves). Cookies are shared across tabs; this only nudges live UIs.
const CLEARED = "cleared";

const listeners = new Set<ConsentListener>();

// Safari and privacy extensions can block the cookie write; the session
// fallback keeps the banner and trackers honoring the click regardless.
let sessionDecision: TrackingConsent | undefined;

function parseConsent(raw: unknown): TrackingConsent | undefined {
  return raw === "granted" || raw === "denied" ? raw : undefined;
}

function notify(consent: TrackingConsent): void {
  for (const listener of listeners) {
    listener(consent);
  }
}

// Node also has BroadcastChannel and an open one keeps the event loop alive,
// so the guard must be environmental, not try/catch.
const channel =
  typeof window === "undefined"
    ? undefined
    : (() => {
        try {
          const bc = new BroadcastChannel("tfp-tracking-consent");
          bc.onmessage = (event) => {
            if (event.data === CLEARED) {
              sessionDecision = undefined;
              notify(DEFAULT_CONSENT);
              return;
            }
            const consent = parseConsent(event.data);
            if (!consent) return;
            sessionDecision = consent;
            notify(consent);
          };
          return bc;
        } catch {
          return undefined;
        }
      })();

function broadcast(message: string): void {
  try {
    channel?.postMessage(message);
  } catch {
    // Cross-tab sync is best-effort.
  }
}

export function resolveTrackingConsent(
  raw: string | undefined,
): TrackingConsent {
  return parseConsent(raw) ?? DEFAULT_CONSENT;
}

export function getStoredTrackingConsent(): TrackingConsent | undefined {
  try {
    const match = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${TRACKING_CONSENT_COOKIE}=`));
    const raw = match?.slice(TRACKING_CONSENT_COOKIE.length + 1);
    return parseConsent(raw) ?? sessionDecision;
  } catch {
    return sessionDecision;
  }
}

export function getTrackingConsent(): TrackingConsent {
  return getStoredTrackingConsent() ?? DEFAULT_CONSENT;
}

export function setTrackingConsent(consent: TrackingConsent): void {
  sessionDecision = consent;
  try {
    const secure = location.protocol === "https:" ? "; secure" : "";
    // biome-ignore lint/suspicious/noDocumentCookie: the suggested Cookie Store API is async (this gate must read synchronously at init) and not yet available in all supported Safari/Firefox versions.
    document.cookie = `${TRACKING_CONSENT_COOKIE}=${consent}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${secure}`;
  } catch {
    // Blocked cookie write: sessionDecision above still applies the choice.
  }
  notify(consent);
  broadcast(consent);
}

// Withdrawal must be as easy as consent: clearing reopens the banner (no
// stored decision) and trackers fall back to the denied default meanwhile.
export function clearTrackingConsent(): void {
  sessionDecision = undefined;
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: see setTrackingConsent.
    document.cookie = `${TRACKING_CONSENT_COOKIE}=; path=/; max-age=0`;
  } catch {
    // Best-effort; listeners still fall back to denied below.
  }
  notify(DEFAULT_CONSENT);
  broadcast(CLEARED);
}

export function onTrackingConsentChange(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
