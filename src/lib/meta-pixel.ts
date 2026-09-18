import {
  getTrackingConsent,
  onTrackingConsentChange,
} from "@/lib/tracking-consent";

// The official base snippet, in TypeScript: a queueing stub is installed as
// window.fbq, then fbevents.js takes the same function over by attaching
// callMethod — so this module's reference stays valid after load.
type FbqStub = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  loaded: boolean;
  version: string;
};

type Fbq = (...args: unknown[]) => void;

let fbq: Fbq | undefined;
let scriptInjected = false;

// Even the fbevents.js request transfers the visitor's IP to Meta, so the
// script itself waits for acceptance; the stub queues everything meanwhile.
function injectScript(): void {
  if (scriptInjected) return;
  scriptInjected = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

export function loadMetaPixel(): void {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId || fbq) return;

  try {
    const existing = Reflect.get(window, "fbq");
    if (typeof existing === "function") {
      // Another installer (tag manager, extension) got here first. The
      // official snippet's `if (f.fbq) return` guard exists so a second
      // installer never clobbers a live fbq — adopt it instead, and leave
      // script loading to whoever installed it.
      fbq = (...args: unknown[]) => {
        Reflect.apply(existing, undefined, args);
      };
      scriptInjected = true;
    } else {
      const stub: FbqStub = Object.assign(
        (...args: unknown[]) => {
          if (stub.callMethod) stub.callMethod(...args);
          else stub.queue.push(args);
        },
        { queue: [], push: undefined, loaded: true, version: "2.0" },
      );
      stub.push = stub;
      if (!Reflect.get(window, "_fbq")) Reflect.set(window, "_fbq", stub);
      Reflect.set(window, "fbq", stub);
      fbq = stub;
    }

    // Meta's GDPR doc: revoke must precede init. Events sent after a revoke
    // are queued by fbevents and ALL flush on a later grant — so nothing
    // below fires a track call unless consent is granted at that moment;
    // otherwise a denial-window backlog (stale PageViews, even a Lead)
    // would transmit retroactively once the user opts in.
    const granted = getTrackingConsent() === "granted";
    if (!granted) fbq("consent", "revoke");
    fbq("init", pixelId);
    if (granted) {
      fbq("track", "PageView");
      injectScript();
    }

    onTrackingConsentChange((consent) => {
      if (consent === "granted") {
        fbq?.("consent", "grant");
        // Fresh, post-consent view of the current page — replaces the
        // deliberately unqueued pre-consent one.
        fbq?.("track", "PageView");
        injectScript();
      } else {
        fbq?.("consent", "revoke");
      }
    });
  } catch {
    // The pixel must never take the page down with it.
  }
}

// SPA soft navigations don't reload the base snippet; Meta expects a manual
// PageView per route change. try/catch because a synchronous fbevents throw
// here would otherwise surface in UI flows (e.g. the post-submit redirect).
export function trackPixelPageView(): void {
  try {
    if (getTrackingConsent() !== "granted") return;
    fbq?.("track", "PageView");
  } catch {
    // Best-effort only.
  }
}

// eventID (the lead's public token) is what lets a future Conversions API
// twin deduplicate against this browser event — Meta discards the later of
// two matching (event name, id) pairs within 48h.
export function trackLead(eventId: string): void {
  try {
    if (getTrackingConsent() !== "granted") return;
    fbq?.("track", "Lead", {}, { eventID: eventId });
  } catch {
    // Best-effort only.
  }
}

export function trackInitiateCheckout(eventId?: string): void {
  try {
    if (getTrackingConsent() !== "granted") return;
    fbq?.(
      "track",
      "InitiateCheckout",
      {},
      eventId ? { eventID: eventId } : undefined,
    );
  } catch {
    // Best-effort only.
  }
}
