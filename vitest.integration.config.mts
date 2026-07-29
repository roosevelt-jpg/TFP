import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Separate from the unit config because these hit a real Postgres: the money
// path's guarantees (concurrent ingresses, replay safety, the write fence) are
// properties of the database, and a mocked Prisma can only prove the mock.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // Shared tables, so files must not race each other.
    fileParallelism: false,
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
    env: {
      NEXT_PUBLIC_APP_URL: "https://example.com",
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
      STRIPE_SECRET_KEY: "rk_test_ci_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_ci_placeholder",
      FORMULA_BLOB_STORE_ID: "store_ci_placeholder",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_ci_placeholder",
    },
  },
});
