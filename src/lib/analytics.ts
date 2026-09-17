export type AnalyticsProperties = Record<string, string | number | boolean>;

// Read public vars directly so client CTA tracking never pulls in `@/env`
// (which validates required server + Turnstile keys and can crash the landing).
function posthogConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
}

// Same both-vars condition as the init in instrumentation-client.ts — a
// half-configured deploy must no-op, not capture on an uninitialized SDK.
// Dynamic import keeps posthog-js out of chunks for unconfigured builds;
// it resolves to the singleton the instrumentation init already loaded.
export function trackEvent(
  name: string,
  properties?: AnalyticsProperties,
): void {
  if (!posthogConfigured()) return;
  void import("posthog-js").then(({ default: posthog }) =>
    posthog.capture(name, properties),
  );
}
