import { env } from "@/env";

export type AnalyticsProperties = Record<string, string | number | boolean>;

// Same both-vars condition as the init in instrumentation-client.ts — a
// half-configured deploy must no-op, not capture on an uninitialized SDK.
// Dynamic import keeps posthog-js out of chunks for unconfigured builds;
// it resolves to the singleton the instrumentation init already loaded.
export function trackEvent(
  name: string,
  properties?: AnalyticsProperties,
): void {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY || !env.NEXT_PUBLIC_POSTHOG_HOST) return;
  void import("posthog-js").then(({ default: posthog }) =>
    posthog.capture(name, properties),
  );
}
