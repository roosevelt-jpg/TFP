import * as Sentry from "@sentry/nextjs";

import { scrubEvent, scrubLog } from "@/lib/sentry-scrub";
import {
  getTrackingConsent,
  onTrackingConsentChange,
} from "@/lib/tracking-consent";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  enableLogs: true,
  beforeSend: scrubEvent,
  beforeSendLog: scrubLog,
  // Scripts injected by in-app webviews (Instagram iOS bridge, Android
  // WebView), not our code: unactionable and they burn quota.
  ignoreErrors: ["window.webkit.messageHandlers", "Java object is gone"],
});

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Unset key/host (local dev, CI) means no analytics at all — same graceful
// degradation as the Sentry DSN above. Dynamic import keeps the ~55KB SDK out
// of the boot chunk; Next requires this file into the app's client module
// graph, so this resolves to the same singleton `trackEvent` captures on.
if (posthogKey && posthogHost) {
  void import("posthog-js")
    .then(({ default: posthog }) => {
      const consent = getTrackingConsent();
      posthog.init(posthogKey, {
        api_host: posthogHost,
        ui_host: "https://eu.posthog.com",
        defaults: "2026-05-30",
        // PostHog's CMP guidance: always init, gate capture — never the script.
        opt_out_capturing_by_default: consent !== "granted",
        // Without this, posthog still writes its identifier cookie while
        // opted out (capture and persistence are separate gates), breaking
        // the banner's "nothing is set until you choose". It also makes
        // opt-out DELETE the cookie, so withdrawal actually erases.
        opt_out_persistence_by_default: true,
        // Already the default; explicit because /join collects name/email/phone.
        session_recording: { maskAllInputs: true },
      });
      // PostHog persists its own opt-out, and the default above only applies
      // to first visits — reconcile so the consent cookie stays the single
      // source of truth across revisits, other tabs, and manual changes.
      if (consent === "granted" && posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing();
      } else if (consent !== "granted" && !posthog.has_opted_out_capturing()) {
        posthog.opt_out_capturing();
      }
      onTrackingConsentChange((next) => {
        // State checks keep multi-tab broadcasts idempotent (opt-in state is
        // shared storage, so only the first tab transitions it).
        if (next === "granted") {
          if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
          // opt_in only emits $opt_in; the suppressed init-time pageview for
          // the page being looked at RIGHT NOW must be replayed by hand or
          // every consenting visitor's landing page goes uncounted.
          posthog.capture("$pageview");
        } else if (!posthog.has_opted_out_capturing()) {
          posthog.opt_out_capturing();
        }
      });
    })
    .catch(() => {
      // Analytics must never take the page down with it (per the bundled
      // instrumentation-client guide's error-handling directive).
    });
}

// Same lazy pattern as PostHog: nothing ships or runs without the env var.
if (process.env.NEXT_PUBLIC_META_PIXEL_ID) {
  void import("@/lib/meta-pixel")
    .then(({ loadMetaPixel }) => loadMetaPixel())
    .catch(() => {
      // The pixel must never take the page down with it.
    });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
