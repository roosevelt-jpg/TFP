export const SEEDED_REF = "WL-E2ESEED1";
export const SEEDED_PUBLIC_TOKEN = "e2e-seeded-public-token";

import type { BrowserContext } from "@playwright/test";

// Pre-seeds an accepted consent so the fixed banner can't intercept clicks
// on bottom-of-page targets; banner behavior itself is covered only by
// consent-banner.spec.ts.
export async function seedConsent(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: "tfp_tracking_consent",
      value: "granted",
      domain: "localhost",
      path: "/",
    },
  ]);
}
