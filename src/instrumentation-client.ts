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
        if (next === "granted") posthog.opt_in_capturing();
        else posthog.opt_out_capturing();
      });
    })
    .catch(() => {
      // Analytics must never take the page down with it (per the bundled
      // instrumentation-client guide's error-handling directive).
    });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
