import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";

import "./src/env";

function sentryOrigin(): string {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "";
  try {
    return ` https://${new URL(dsn).host}`;
  } catch {
    return "";
  }
}

// Static CSP (no nonce) so pages stay statically prerendered. Enforced after
// validating in Report-Only that the live site raised no real violations.
// Tighten further when the remaining third-party origins (PostHog) are added.
// Cloudflare Turnstile loads a script and renders its challenge in an iframe.
const TURNSTILE = "https://challenges.cloudflare.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE}${sentryOrigin()}`,
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
