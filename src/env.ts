import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PAYMENTS_LIVE: z.stringbool().default(false),
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM: z.string().min(1),
    EMAIL_LOGO_URL: z.url(),
    EMAIL_COMMUNITY_URL: z.url(),
    UPSTASH_REDIS_REST_URL: z.url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    GHL_INTEGRATION_TOKEN: z.string().min(1),
    GHL_LOCATION_ID: z.string().min(1),
    // Launch-day kill switch: CRM sync isn't time-critical, so it can be
    // disabled under incident without touching emails and redriven later.
    GHL_SYNC_ENABLED: z.stringbool().default(true),

    // BetterStack heartbeat. Reconcile is the guarantee of last resort, so it
    // failing silently is the one failure nothing else would catch.
    RECONCILE_HEARTBEAT_URL: z.url().optional(),

    // Private store holding the master programme and each watermarked copy.
    FORMULA_BLOB_STORE_ID: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
    NEXT_PUBLIC_META_PIXEL_ID: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
