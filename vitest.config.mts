import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Targets are server logic; the rare DOM test opts in per file with a
    // `// @vitest-environment jsdom` docblock (environmentMatchGlobs was
    // removed in Vitest 4).
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    alias: {
      // `server-only` throws outside a React Server context.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
    // Mirrors the CI build job's placeholder env so `@/env` validates the
    // same way in tests as in `next build` (SKIP_ENV_VALIDATION would leave
    // every env.X undefined at runtime instead).
    env: {
      NEXT_PUBLIC_APP_URL: "https://example.com",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
      RESEND_API_KEY: "re_placeholder",
      RESEND_FROM: "onboarding@resend.dev",
      EMAIL_LOGO_URL: "https://example.com/email/logo.png",
      EMAIL_COMMUNITY_URL: "https://example.com/email/community.jpg",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "ci_placeholder",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      GHL_INTEGRATION_TOKEN: "ci_placeholder",
      GHL_LOCATION_ID: "ci_placeholder",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/actions/**"],
      reporter: ["text", "lcov"],
    },
  },
});
