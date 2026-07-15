import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";

import "./src/env";

// CSP origin (with leading space) from an env-provided URL; unset or
// malformed values degrade to "" so the directive stays valid. Works for the
// Sentry DSN (origin strips its credentials) and the PostHog proxy host,
// which serves both ingestion (connect-src) and the lazy-loaded
// session-replay recorder chunk (script-src).
function cspOrigin(value: string | undefined): string {
  if (!value) return "";
  try {
    return ` ${new URL(value).origin}`;
  } catch {
    return "";
  }
}

const sentryOrigin = () => cspOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN);

// Direct PostHog hosts pull SDK assets from sibling subdomains (e.g.
// eu.i.posthog.com fetches from eu-assets.i.posthog.com), so PostHog
// documents the wildcard as the only stable form. Our own proxy domain
// serves everything from one origin and stays pinned.
function posthogOrigin(): string {
  const origin = cspOrigin(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  return origin.endsWith(".posthog.com") ? " https://*.posthog.com" : origin;
}

// Static CSP (no nonce) so pages stay statically prerendered — a core project
// choice (cacheComponents). Per the Next.js CSP guide, a no-nonce static CSP
// needs 'unsafe-inline' in script-src for the framework's inline hydration
// bootstrap; nonces would force every page dynamic. 'unsafe-eval' is dev-only
// (React uses eval for debug stacks; not needed in prod).
// Cloudflare Turnstile loads a script and renders its challenge in an iframe.
const TURNSTILE = "https://challenges.cloudflare.com";
// Meta documents script-src for fbevents.js. The /tr beacon goes to
// www.facebook.com via sendBeacon (connect-src) but falls back to an image
// GET when beacons are unavailable (img-src) — verified with the Pixel
// Helper when the pixel is enabled.
const metaEnabled = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);
const metaScript = metaEnabled ? " https://connect.facebook.net" : "";
const metaBeacon = metaEnabled ? " https://www.facebook.com" : "";
const isDev = process.env.NODE_ENV === "development";
const scriptEval = isDev ? " 'unsafe-eval'" : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${scriptEval} ${TURNSTILE}${posthogOrigin()}${metaScript}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data:${metaBeacon}`,
  "font-src 'self'",
  // PostHog's replay compression worker is created from a blob: URL; without
  // an explicit worker-src it falls back to script-src, which has no blob:.
  "worker-src 'self' blob:",
  `connect-src 'self' ${TURNSTILE}${sentryOrigin()}${posthogOrigin()}${metaBeacon}`,
  `frame-src ${TURNSTILE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
